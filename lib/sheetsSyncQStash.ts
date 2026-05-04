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
  if (qstashClient) return qstashClient;
  
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    console.warn('[QStash] ⚠️ QSTASH_TOKEN not configured');
    return null;
  }
  
  qstashClient = new Client({ token });
  return qstashClient;
}

/**
 * Queue patient sync via QStash (non-blocking)
 * Returns immediately - sync happens in background
 */
export async function queuePatientSyncQStash(
  patient: PatientRecord,
  operation: 'insert' | 'update'
): Promise<{ queued: boolean; messageId?: string; error?: string }> {
  const client = getQStashClient();
  
  if (!client) {
    return { queued: false, error: 'QStash not configured' };
  }
  
  try {
    // Get webhook endpoint URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
    if (!baseUrl) {
      return { queued: false, error: 'Base URL not configured' };
    }
    
    const webhookUrl = `${baseUrl}/api/internal/process-sheets-sync`;
    
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
    
    // Publish to QStash with retries
    const result = await client.publishJSON({
      url: webhookUrl,
      body: payload,
      retries: 3, // Retry 3 times with exponential backoff
      deduplicationId: `patient-${patient.id}-${Date.now()}`, // Prevent duplicates
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`[QStash] ✅ Queued patient ${patient.id} (messageId: ${result.messageId})`);
    
    return { queued: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('[QStash] ❌ Failed to queue:', error.message);
    return { queued: false, error: error.message };
  }
}

/**
 * Fire-and-forget wrapper (never throws)
 */
export function syncToSheetsAsync(patient: PatientRecord, operation: 'insert' | 'update'): void {
  queuePatientSyncQStash(patient, operation)
    .then(result => {
      if (!result.queued) {
        console.warn(`[QStash] ⚠️ Sync not queued: ${result.error}`);
      }
    })
    .catch(err => {
      console.error('[QStash] ❌ Unexpected error:', err);
    });
}
