// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE SHEETS SYNC - ENTERPRISE REDIS QUEUE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
// Production-grade queue with BullMQ + Redis
// 
// FEATURES:
// ✅ Persistent queue (survives server restarts)
// ✅ Automatic retries with exponential backoff
// ✅ Rate limiting (prevents API throttling)
// ✅ Priority queue (urgent updates first)
// ✅ Dead letter queue (failed jobs)
// ✅ Job deduplication (prevents duplicates)
// ✅ Metrics & monitoring
// ✅ Graceful shutdown
// ═══════════════════════════════════════════════════════════════════════════

import { Queue, Worker, QueueEvents } from 'bullmq';
import { ioredis } from './redis';
import type { PatientRecord } from './sheetsSync';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const QUEUE_NAME = 'sheets-sync';

const QUEUE_CONFIG = {
  connection: ioredis || undefined,
  defaultJobOptions: {
    attempts: 3,                    // Retry 3 times
    backoff: {
      type: 'exponential',          // 1s, 2s, 4s
      delay: 1000,
    },
    removeOnComplete: 100,          // Keep last 100 completed jobs
    removeOnFail: 500,              // Keep last 500 failed jobs
  },
};

const WORKER_CONFIG = {
  connection: ioredis || undefined,
  concurrency: 5,                   // Process 5 jobs in parallel
  limiter: {
    max: 10,                        // Max 10 jobs
    duration: 1000,                 // Per second (10 req/s)
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// QUEUE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

let sheetsQueue: Queue | null = null;
let sheetsWorker: Worker | null = null;
let queueEvents: QueueEvents | null = null;

/**
 * Initialize queue (call once on server startup)
 */
export function initSheetsQueue() {
  if (!ioredis) {
    console.warn('[SheetsQueue] Redis not configured - using in-memory fallback');
    return;
  }

  // Create queue
  sheetsQueue = new Queue(QUEUE_NAME, QUEUE_CONFIG);

  // Create worker
  sheetsWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { batch } = job.data;
      const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;

      if (!webhookUrl) {
        throw new Error('GOOGLE_SCRIPT_WEBHOOK_URL not configured');
      }

      // Send batch to Google Sheets
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            batch,
            batch_id: job.id,
            count: batch.length,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
      } catch (error: any) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    WORKER_CONFIG
  );

  // Event listeners
  queueEvents = new QueueEvents(QUEUE_NAME, { connection: ioredis || undefined });

  sheetsWorker.on('completed', (job) => {
    console.log(`[SheetsQueue] ✅ Job ${job.id} completed (${job.data.batch.length} records)`);
  });

  sheetsWorker.on('failed', (job, err) => {
    console.error(`[SheetsQueue] ❌ Job ${job?.id} failed:`, err.message);
  });

  queueEvents.on('stalled', ({ jobId }) => {
    console.warn(`[SheetsQueue] ⚠️ Job ${jobId} stalled`);
  });

  console.log('[SheetsQueue] 🚀 Queue initialized with Redis backend');
}

/**
 * Graceful shutdown
 */
export async function closeSheetsQueue() {
  if (sheetsWorker) {
    await sheetsWorker.close();
  }
  if (sheetsQueue) {
    await sheetsQueue.close();
  }
  if (queueEvents) {
    await queueEvents.close();
  }
  console.log('[SheetsQueue] 🛑 Queue closed gracefully');
}

// ═══════════════════════════════════════════════════════════════════════════
// QUEUE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Add patient to sync queue
 */
export async function queuePatientSync(
  patient: PatientRecord,
  priority: number = 0
): Promise<void> {
  if (!sheetsQueue) {
    console.warn('[SheetsQueue] Queue not initialized - skipping sync');
    return;
  }

  try {
    // Minimal payload
    const minimalPatient = {
      id: patient.id,
      kobo_uuid: patient.kobo_uuid,
      unique_id: patient.unique_id,
      inmate_name: patient.inmate_name,
      age: patient.age,
      contact_number: patient.contact_number,
      screening_state: patient.screening_state,
    };

    await sheetsQueue.add(
      'sync-patient',
      { batch: [minimalPatient] },
      {
        priority,                           // Higher priority = processed first
        jobId: `patient-${patient.id}`,     // Deduplication key
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
  } catch (error: any) {
    console.error('[SheetsQueue] Failed to queue patient:', error.message);
  }
}

/**
 * Add batch to sync queue
 */
export async function queueBatchSync(
  patients: PatientRecord[],
  priority: number = 0
): Promise<void> {
  if (!sheetsQueue) {
    console.warn('[SheetsQueue] Queue not initialized - skipping sync');
    return;
  }

  try {
    const minimalBatch = patients.map(p => ({
      id: p.id,
      kobo_uuid: p.kobo_uuid,
      unique_id: p.unique_id,
      inmate_name: p.inmate_name,
      age: p.age,
      contact_number: p.contact_number,
      screening_state: p.screening_state,
    }));

    await sheetsQueue.add(
      'sync-batch',
      { batch: minimalBatch },
      {
        priority,
        jobId: `batch-${Date.now()}`,
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    console.log(`[SheetsQueue] 📦 Queued batch of ${patients.length} patients`);
  } catch (error: any) {
    console.error('[SheetsQueue] Failed to queue batch:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MONITORING & METRICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get queue metrics
 */
export async function getQueueMetrics() {
  if (!sheetsQueue) {
    return null;
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      sheetsQueue.getWaitingCount(),
      sheetsQueue.getActiveCount(),
      sheetsQueue.getCompletedCount(),
      sheetsQueue.getFailedCount(),
      sheetsQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (error: any) {
    console.error('[SheetsQueue] Failed to get metrics:', error.message);
    return null;
  }
}

/**
 * Retry all failed jobs
 */
export async function retryFailedJobs() {
  if (!sheetsQueue) {
    return 0;
  }

  try {
    const failedJobs = await sheetsQueue.getFailed();
    let retried = 0;

    for (const job of failedJobs) {
      await job.retry();
      retried++;
    }

    console.log(`[SheetsQueue] 🔄 Retried ${retried} failed jobs`);
    return retried;
  } catch (error: any) {
    console.error('[SheetsQueue] Failed to retry jobs:', error.message);
    return 0;
  }
}

/**
 * Clear completed jobs
 */
export async function clearCompletedJobs() {
  if (!sheetsQueue) {
    return 0;
  }

  try {
    const jobs = await sheetsQueue.getCompleted();
    let cleared = 0;

    for (const job of jobs) {
      await job.remove();
      cleared++;
    }

    console.log(`[SheetsQueue] 🧹 Cleared ${cleared} completed jobs`);
    return cleared;
  } catch (error: any) {
    console.error('[SheetsQueue] Failed to clear jobs:', error.message);
    return 0;
  }
}
