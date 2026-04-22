// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE SHEETS SYNC - FIRE-AND-FORGET MIRROR
// ═══════════════════════════════════════════════════════════════════════════
// Supabase is the source of truth. Sheets is a reporting mirror only.
// All sync operations are non-blocking and never fail the main write.
// ═══════════════════════════════════════════════════════════════════════════

export interface PatientRecord {
  id?: string;
  kobo_uuid?: string | null;
  unique_id?: string | null;
  inmate_name?: string | null;
  [key: string]: any;
}

/**
 * Fire-and-forget sync to Google Sheets
 * Never blocks, never throws, logs errors only
 * 
 * @param patient - Patient record from Supabase
 * @param operation - 'insert' or 'update'
 */
export function syncToSheetsAsync(patient: PatientRecord, operation: 'insert' | 'update'): void {
  const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('[sheetsSync] Webhook not configured, skipping mirror sync');
    return;
  }

  // Fire async without awaiting
  (async () => {
    try {
      const payload = {
        batch: [patient],
        batch_id: `nextjs-${operation}-${Date.now()}`,
        operation: operation.toUpperCase()
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        console.log(`[sheetsSync] ✅ Mirror sync ${operation}: ${patient.kobo_uuid}`);
      } else {
        const text = await response.text();
        console.error(`[sheetsSync] ❌ Mirror sync failed (${response.status}): ${text}`);
      }
    } catch (error: any) {
      console.error(`[sheetsSync] ❌ Mirror sync error:`, error.message);
    }
  })().catch(() => {}); // Swallow all errors
}
