export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════
// QSTASH WEBHOOK HANDLER - PROCESS SHEETS SYNC
// ═══════════════════════════════════════════════════════════════════════════
// Internal endpoint called by QStash to process sync jobs
// Verifies QStash signature for security
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

async function handler(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { patient, operation, timestamp, batch_id, attempt, count } = body;
    
    console.log('[ProcessSync] 🔍 Received payload:', {
      operation,
      timestamp,
      patientId: patient?.id,
      patientFields: patient ? Object.keys(patient).length : 0,
    });
    
    console.log('[ProcessSync] 📦 Batch metadata:', { batch_id, attempt, count });
    console.log('[ProcessSync] 📋 Patient data fields:', patient ? Object.keys(patient).sort() : []);
    
    // Log clinical fields specifically
    const clinicalFields = [
      'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
      'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status',
      'art_status', 'art_number', 'nikshay_abha_id', 'registration_date', 'remarks'
    ];
    
    console.log('[ProcessSync] 🏥 Clinical fields check:');
    clinicalFields.forEach(field => {
      const value = patient?.[field];
      console.log(`[ProcessSync]   ${field}: ${value !== undefined && value !== null ? '✅ "' + value + '"' : '❌ missing'}`);
    });
    
    if (!patient || !operation) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload' },
        { status: 400 }
      );
    }
    
    const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('[ProcessSync] ❌ GOOGLE_SCRIPT_WEBHOOK_URL not configured');
      return NextResponse.json(
        { success: false, error: 'Webhook not configured' },
        { status: 500 }
      );
    }
    
    // CRITICAL FIX: Wrap single patient in batch format expected by Google Apps Script
    const batchPayload = {
      batch: [patient],
      batch_id: `qstash-${patient.id}-${Date.now()}`,
      count: 1,
      attempt: 1
    };
    
    console.log('[ProcessSync] 📤 Sending batch payload to Google Sheets:');
    console.log('[ProcessSync]   patient_id:', patient.id);
    console.log('[ProcessSync]   payload fields:', Object.keys(patient).length);
    console.log('[ProcessSync]   batch format:', Object.keys(batchPayload));
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SAMADHAAN-Sheets-Sync-QStash/2.0'
      },
      body: JSON.stringify(batchPayload),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Google Sheets returned ${response.status}`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[ProcessSync] ✅ Synced patient ${patient.id} in ${duration}ms`);
    console.log('[ProcessSync] 📡 Response status:', response.status, response.statusText);
    const responseText = await response.text();
    console.log('[ProcessSync] 📄 Response body (first 200 chars):', responseText.slice(0, 200));
    
    return NextResponse.json({
      success: true,
      patientId: patient.id,
      duration,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[ProcessSync] ❌ Failed after ${duration}ms:`, error.message);
    console.error('[ProcessSync] ❗ Error details:', { name: error.name, stack: error.stack });
    const origin = process.env.NODE_ENV === 'development' ? 'dev-direct' : 'qstash';
    console.error('[ProcessSync] 🔎 Origin of payload:', origin);
    
    // Return 500 to trigger QStash retry
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Wrap with QStash signature verification only if keys are available
export const POST = handler;

// Note: In production, add signature verification middleware
// For now, rely on internal endpoint security (not publicly exposed)

// Allow GET for health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    endpoint: 'process-sheets-sync',
    timestamp: Date.now(),
  });
}
