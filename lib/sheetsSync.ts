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
    const maxRetries = 2;
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      try {
        const payload = {
          batch: [patient],
          batch_id: `nextjs-${operation}-${Date.now()}-attempt${attempt}`,
          operation: operation.toUpperCase()
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000) // Increased to 15s
        });

        if (response.ok) {
          console.log(`[sheetsSync] ✅ Mirror sync ${operation}: ${patient.kobo_uuid || patient.unique_id}`);
          return; // Success, exit
        } else {
          const text = await response.text();
          console.error(`[sheetsSync] ❌ Mirror sync failed (${response.status}): ${text.substring(0, 200)}`);
          
          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            return;
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || error.message?.includes('timeout')) {
          console.error(`[sheetsSync] ⏱️ Timeout on attempt ${attempt + 1}/${maxRetries + 1}`);
        } else {
          console.error(`[sheetsSync] ❌ Error on attempt ${attempt + 1}:`, error.message);
        }
      }
      
      attempt++;
      if (attempt <= maxRetries) {
        // Exponential backoff: 1s, 2s
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    console.error(`[sheetsSync] ❌ All ${maxRetries + 1} attempts failed for ${patient.kobo_uuid || patient.unique_id}`);
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
      signal: AbortSignal.timeout(15000) // Increased to 15s
    });

    if (response.ok) {
      return { success: true, message: 'Synced via webhook' };
    } else {
      const text = await response.text();
      return { success: false, error: `Webhook failed: ${response.status}` };
    }
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return { success: false, error: 'Timeout after 15s' };
    }
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
