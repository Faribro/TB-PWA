// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE SHEETS SYNC - OPTIMIZED FIRE-AND-FORGET MIRROR
// ═══════════════════════════════════════════════════════════════════════════
// Supabase is the source of truth. Sheets is a reporting mirror only.
// All sync operations are non-blocking and never fail the main write.
// OPTIMIZATIONS: Reduced timeout, zero retries, minimal payload
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
 * Fire-and-forget sync to Google Sheets (OPTIMIZED)
 * Never blocks, never throws, logs errors only
 * 
 * OPTIMIZATIONS:
 * - Reduced timeout from 30s → 10s (saves 20s on failures)
 * - Zero retries (saves 2s+ on failures)
 * - Minimal payload (only essential fields)
 * - Immediate return (non-blocking)
 * 
 * @param patient - Patient record from Supabase
 * @param operation - 'insert' or 'update'
 */
export function syncToSheetsAsync(patient: PatientRecord, operation: 'insert' | 'update'): void {
  const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return; // Silent skip if not configured
  }

  // Fire async without awaiting (truly non-blocking)
  setImmediate(() => {
    (async () => {
      try {
        // OPTIMIZATION: Minimal payload (only essential fields for sheets)
        const minimalPayload = {
          batch: [{
            id: patient.id,
            kobo_uuid: patient.kobo_uuid,
            unique_id: patient.unique_id,
            inmate_name: patient.inmate_name,
            age: patient.age,
            contact_number: patient.contact_number,
            screening_state: patient.screening_state,
          }],
          batch_id: `${operation}-${Date.now()}`,
          operation: operation.toUpperCase()
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(minimalPayload),
          signal: AbortSignal.timeout(10000), // Reduced from 30s → 10s
          // @ts-ignore - keepalive for better connection reuse
          keepalive: true
        });

        if (response.ok) {
          console.log(`[sheetsSync] ✅ ${operation}: ${patient.unique_id}`);
        } else {
          console.error(`[sheetsSync] ❌ ${response.status}`);
        }
      } catch (error: any) {
        // Silent fail - sheets sync is non-critical
        if (error.name !== 'AbortError') {
          console.error(`[sheetsSync] ❌ ${error.message}`);
        }
      }
    })();
  });
}

/**
 * Legacy function for backward compatibility
 * Uses optimized fire-and-forget webhook sync
 */
export async function appendPatientToSheets(patient: PatientRecord): Promise<SyncResult> {
  const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return { success: false, error: 'Webhook not configured' };
  }

  try {
    const payload = {
      batch: [patient],
      batch_id: `legacy-${Date.now()}`
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000) // Reduced from 30s
    });

    if (response.ok) {
      return { success: true, message: 'Synced' };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error: any) {
    return { success: false, error: error.name === 'AbortError' ? 'Timeout' : error.message };
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function updatePatientInSheets(patient: PatientRecord): Promise<SyncResult> {
  return appendPatientToSheets(patient);
}
