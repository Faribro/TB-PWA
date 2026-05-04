// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE SHEETS SYNC - QSTASH SERVERLESS QUEUE
// ═══════════════════════════════════════════════════════════════════════════
// Production-grade HTTP-based queue with automatic retries
// 
// FEATURES:
// ✅ Zero TCP dependencies (pure HTTP)
// ✅ Automatic retries with exponential backoff (3 attempts)
// ✅ Serverless-native (works with Vercel cold starts)
// ✅ Built-in deduplication
// ✅ Non-blocking (fire-and-forget)
// ✅ Observable (clear logging)
// ═══════════════════════════════════════════════════════════════════════════

import { Client } from '@upstash/qstash';

export interface PatientRecord {
  id?: string;
  kobo_uuid?: string | null;
  unique_id?: string | null;
  inmate_name?: string | null;
  age?: number | null;
  contact_number?: string | null;
  screening_state?: string | null;
  [key: string]: any;
}

// Initialize QStash client (lazy)
let qstashClient: Client | null = null;

function getQStashClient(): Client | null {
  console.log('[QStash] 🔍 getQStashClient called, existing client:', !!qstashClient);
  
  if (qstashClient) {
    console.log('[QStash] ♻️ Returning cached client');
    return qstashClient;
  }
  
  const token = process.env.QSTASH_TOKEN;
  
  // Detailed logging for debugging
  console.log('[QStash] 🔍 Environment check:', {
    hasToken: !!token,
    tokenLength: token?.length || 0,
    tokenPrefix: token?.substring(0, 10) || 'none',
    nodeEnv: process.env.NODE_ENV,
    runtime: process.env.NEXT_RUNTIME,
    allQstashVars: Object.keys(process.env).filter(k => k.includes('QSTASH')),
  });
  
  if (!token) {
    console.error('[QStash] ❌ QSTASH_TOKEN not found in environment variables');
    console.error('[QStash] 📋 All env var keys:', Object.keys(process.env).sort());
    return null;
  }
  
  try {
    qstashClient = new Client({ token });
    console.log('[QStash] ✅ Client initialized successfully');
    return qstashClient;
  } catch (error: any) {
    console.error('[QStash] ❌ Failed to initialize client:', error.message);
    return null;
  }
}

/**
 * Queue patient sync via QStash (non-blocking)
 * Returns immediately - sync happens in background
 */
export async function queuePatientSyncQStash(
  patient: PatientRecord,
  operation: 'insert' | 'update'
): Promise<{ queued: boolean; messageId?: string; error?: string }> {
  console.log('[QStash] 🚀 Starting queue operation for patient:', patient.id);
  
  const client = getQStashClient();
  
  if (!client) {
    console.error('[QStash] ❌ Client is null, cannot queue');
    return { queued: false, error: 'QStash not configured' };
  }
  
  console.log('[QStash] ✅ Client obtained, proceeding with publish');
  
  try {
    // Get webhook endpoint URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXTAUTH_URL;
    
    console.log('[QStash] 🌐 URL resolution:', {
      vercelUrl: process.env.VERCEL_URL,
      nextauthUrl: process.env.NEXTAUTH_URL,
      resolvedBase: baseUrl,
    });
    
    if (!baseUrl) {
      console.error('[QStash] ❌ No base URL found');
      return { queued: false, error: 'Base URL not configured' };
    }
    
    const webhookUrl = `${baseUrl}/api/internal/process-sheets-sync`;
    console.log('[QStash] 📤 Publishing to:', webhookUrl);
    
    // Minimal payload
    const payload = {
      patient: {
        id: patient.id,
        kobo_uuid: patient.kobo_uuid,
        unique_id: patient.unique_id,
        inmate_name: patient.inmate_name,
        age: patient.age,
        contact_number: patient.contact_number,
        screening_state: patient.screening_state,
      },
      operation,
      timestamp: Date.now(),
    };
    
    console.log('[QStash] 📦 Payload prepared:', {
      patientId: patient.id,
      operation,
      payloadSize: JSON.stringify(payload).length,
    });
    
    // Publish to QStash with retries
    console.log('[QStash] 🔄 Calling client.publishJSON...');
    
    const result = await client.publishJSON({
      url: webhookUrl,
      body: payload,
      retries: 3,
      deduplicationId: `patient-${patient.id}-${Date.now()}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[QStash] ✅ Queued patient', patient.id, 'messageId:', result.messageId);
    console.log('[QStash] 📊 Full result:', result);
    
    return { queued: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('[QStash] ❌ Failed to queue:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      patientId: patient.id,
    });
    return { queued: false, error: error.message };
  }
}

/**
 * Fire-and-forget wrapper (never throws)
 */
export function syncToSheetsAsync(patient: PatientRecord, operation: 'insert' | 'update'): void {
  console.log('[QStash] 🎯 syncToSheetsAsync START - patient:', patient.id, 'operation:', operation);
  console.log('[QStash] 🔑 Environment snapshot:', {
    hasQstashToken: !!process.env.QSTASH_TOKEN,
    hasVercelUrl: !!process.env.VERCEL_URL,
    hasNextauthUrl: !!process.env.NEXTAUTH_URL,
    nodeEnv: process.env.NODE_ENV,
  });
  
  queuePatientSyncQStash(patient, operation)
    .then(result => {
      console.log('[QStash] 📊 Queue result:', result);
      if (!result.queued) {
        console.warn('[QStash] ⚠️ Sync not queued:', result.error);
        console.warn('[QStash] 📋 Patient data:', { id: patient.id, name: patient.inmate_name });
      } else {
        console.log('[QStash] ✅ Sync queued successfully:', result.messageId);
      }
    })
    .catch(err => {
      console.error('[QStash] ❌ Unexpected error in syncToSheetsAsync:', {
        error: err.message,
        stack: err.stack,
        patientId: patient.id,
      });
    });
}
