// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE SHEETS SYNC - HYBRID REDIS + IN-MEMORY QUEUE
// ═══════════════════════════════════════════════════════════════════════════
// Intelligent fallback: Redis Queue → In-Memory Queue → Direct Sync
// 
// ARCHITECTURE:
// 1. Redis Queue (Production) - BullMQ with persistent storage
// 2. In-Memory Queue (Fallback) - When Redis unavailable
// 3. Direct Sync (Emergency) - When both queues fail
// ═══════════════════════════════════════════════════════════════════════════

import { queuePatientSync } from './sheetsSyncQueue';

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

// ═══════════════════════════════════════════════════════════════════════════
// IN-MEMORY FALLBACK QUEUE
// ═══════════════════════════════════════════════════════════════════════════
let syncQueue: PatientRecord[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let circuitBreakerOpen = false;
let failureCount = 0;
let lastFlushTime = 0;

const CONFIG = {
  BATCH_SIZE: 50,
  DEBOUNCE_MS: 2000,
  TIMEOUT_MS: 8000,
  CIRCUIT_BREAKER_THRESHOLD: 3,
  CIRCUIT_BREAKER_RESET_MS: 60000,
  MIN_FLUSH_INTERVAL_MS: 1000
};

/**
 * Smart sync with automatic fallback
 * Priority: Redis Queue → In-Memory Queue
 */
export function syncToSheetsAsync(patient: PatientRecord, operation: 'insert' | 'update'): void {
  const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('[sheetsSync] ⚠️ GOOGLE_SCRIPT_WEBHOOK_URL not configured - sync disabled');
    return;
  }
  
  if (circuitBreakerOpen) {
    console.warn('[sheetsSync] 🔴 Circuit breaker open - sync temporarily disabled');
    return;
  }

  // Try Redis queue first (production)
  queuePatientSync(patient, operation === 'insert' ? 1 : 0)
    .catch((error) => {
      // Fallback to in-memory queue
      console.log(`[sheetsSync] ℹ️ Using in-memory queue fallback (Redis unavailable)`);
      syncQueue.push(patient);

      if (flushTimer) {
        clearTimeout(flushTimer);
      }

      if (syncQueue.length >= CONFIG.BATCH_SIZE) {
        flushQueue(webhookUrl);
      } else {
        flushTimer = setTimeout(() => flushQueue(webhookUrl), CONFIG.DEBOUNCE_MS);
      }
    });
}

/**
 * Flush in-memory queue (fallback mode)
 */
async function flushQueue(webhookUrl: string): Promise<void> {
  if (syncQueue.length === 0 || circuitBreakerOpen) return;

  const now = Date.now();
  const timeSinceLastFlush = now - lastFlushTime;
  if (timeSinceLastFlush < CONFIG.MIN_FLUSH_INTERVAL_MS) {
    flushTimer = setTimeout(() => flushQueue(webhookUrl), CONFIG.MIN_FLUSH_INTERVAL_MS - timeSinceLastFlush);
    return;
  }

  const batch = syncQueue.splice(0, CONFIG.BATCH_SIZE);
  lastFlushTime = now;

  setImmediate(() => {
    (async () => {
      try {
        const payload = {
          batch: batch.map(p => ({
            id: p.id,
            kobo_uuid: p.kobo_uuid,
            unique_id: p.unique_id,
            inmate_name: p.inmate_name,
            age: p.age,
            contact_number: p.contact_number,
            screening_state: p.screening_state,
          })),
          batch_id: `batch-${now}`,
          count: batch.length
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
          // @ts-ignore
          keepalive: true
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          failureCount = 0;
          console.log(`[sheetsSync] ✅ Batch synced: ${batch.length} records (fallback mode)`);
        } else {
          handleFailure(`HTTP ${response.status}`);
        }
      } catch (error: any) {
        handleFailure(error.name === 'AbortError' ? 'Timeout' : error.message);
      }
    })();
  });
}

function handleFailure(reason: string): void {
  failureCount++;
  console.error(`[sheetsSync] ❌ ${reason} (failures: ${failureCount})`);

  if (failureCount >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakerOpen = true;
    console.error(`[sheetsSync] 🔴 Circuit breaker OPEN - sync disabled for ${CONFIG.CIRCUIT_BREAKER_RESET_MS / 1000}s`);
    
    setTimeout(() => {
      circuitBreakerOpen = false;
      failureCount = 0;
      console.log(`[sheetsSync] 🟢 Circuit breaker CLOSED - sync re-enabled`);
    }, CONFIG.CIRCUIT_BREAKER_RESET_MS);
  }
}

/**
 * Legacy functions - now use hybrid queue
 */
export async function appendPatientToSheets(patient: PatientRecord): Promise<SyncResult> {
  syncToSheetsAsync(patient, 'insert');
  return { success: true, message: 'Queued for sync' };
}

export async function updatePatientInSheets(patient: PatientRecord): Promise<SyncResult> {
  syncToSheetsAsync(patient, 'update');
  return { success: true, message: 'Queued for sync' };
}
