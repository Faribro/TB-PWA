// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE SHEETS SYNC - DB-BACKED FALLBACK QUEUE
// ═══════════════════════════════════════════════════════════════════════════
// Durable fallback when QStash is unavailable
// Uses Supabase table as job queue
// ═══════════════════════════════════════════════════════════════════════════

import { getSupabaseClient } from './supabase-server';
import type { PatientRecord } from './sheetsSyncQStash';

/**
 * Queue patient sync to DB table (fallback)
 * Returns immediately - processing happens via cron/polling
 */
export async function queuePatientSyncDB(
  patient: PatientRecord,
  operation: 'insert' | 'update'
): Promise<{ queued: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('sync_queue')
      .insert({
        patient_id: patient.id,
        payload: patient, // CRITICAL FIX: Send complete patient object
        operation,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('[SyncDB] ❌ Failed to queue:', error.message);
      return { queued: false, error: error.message };
    }
    
    console.log(`[SyncDB] ✅ Queued patient ${patient.id} to DB fallback`);
    return { queued: true };
  } catch (error: any) {
    console.error('[SyncDB] ❌ Unexpected error:', error.message);
    return { queued: false, error: error.message };
  }
}

/**
 * Process pending sync jobs (called by cron or manual trigger)
 */
export async function processPendingSyncs(limit: number = 50): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const supabase = getSupabaseClient();
  const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('[SyncDB] ⚠️ GOOGLE_SCRIPT_WEBHOOK_URL not configured');
    return { processed: 0, succeeded: 0, failed: 0 };
  }
  
  try {
    // Fetch pending jobs
    const { data: jobs, error: fetchError } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (fetchError || !jobs || jobs.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }
    
    let succeeded = 0;
    let failed = 0;
    
    // Process each job
    for (const job of jobs) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(job.payload),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          // Mark as completed
          await supabase
            .from('sync_queue')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', job.id);
          
          succeeded++;
          console.log(`[SyncDB] ✅ Processed job ${job.id}`);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error: any) {
        // Increment retry count
        await supabase
          .from('sync_queue')
          .update({ 
            retry_count: job.retry_count + 1,
            last_error: error.message,
            status: job.retry_count + 1 >= 3 ? 'failed' : 'pending',
          })
          .eq('id', job.id);
        
        failed++;
        console.error(`[SyncDB] ❌ Job ${job.id} failed:`, error.message);
      }
    }
    
    return { processed: jobs.length, succeeded, failed };
  } catch (error: any) {
    console.error('[SyncDB] ❌ Process error:', error.message);
    return { processed: 0, succeeded: 0, failed: 0 };
  }
}
