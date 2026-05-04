// ═══════════════════════════════════════════════════════════════════════════
// QSTASH WEBHOOK HANDLER - PROCESS SHEETS SYNC
// ═══════════════════════════════════════════════════════════════════════════
// Internal endpoint called by QStash to process sync jobs
// Verifies QStash signature for security
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

async function handler(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { patient, operation, timestamp } = body;
    
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
    
    // Send to Google Sheets
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Google Sheets returned ${response.status}`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[ProcessSync] ✅ Synced patient ${patient.id} in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      patientId: patient.id,
      duration,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[ProcessSync] ❌ Failed after ${duration}ms:`, error.message);
    
    // Return 500 to trigger QStash retry
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Wrap with QStash signature verification (only in production)
export const POST = process.env.NODE_ENV === 'production' 
  ? verifySignatureAppRouter(handler)
  : handler;

// Allow GET for health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    endpoint: 'process-sheets-sync',
    timestamp: Date.now(),
  });
}
