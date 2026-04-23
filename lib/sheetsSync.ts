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

export interface SyncResult {
  success: boolean;
  error?: string;
  message?: string;
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

/**
 * Legacy function for backward compatibility
 * Uses fire-and-forget webhook sync
 */
export async function appendPatientToSheets(patient: PatientRecord): Promise<SyncResult> {
  const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return { success: false, error: 'Webhook not configured' };
  }

  try {
    const payload = {
      batch: [patient],
      batch_id: `legacy-append-${Date.now()}`
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      return { success: true, message: 'Synced via webhook' };
    } else {
      const text = await response.text();
      return { success: false, error: `Webhook failed: ${response.status}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Legacy function for backward compatibility
 * Uses fire-and-forget webhook sync
 */
export async function updatePatientInSheets(patient: PatientRecord): Promise<SyncResult> {
  return appendPatientToSheets(patient); // Same implementation for webhook
}
