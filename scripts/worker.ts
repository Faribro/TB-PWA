import http from 'http';
import { flushSheetsQueue } from '../lib/sheetsSync';
import { pollSheetsForChanges } from '../lib/sheetsPullSync';

const HEALTH_PORT = process.env.WORKER_HEALTH_PORT ? parseInt(process.env.WORKER_HEALTH_PORT, 10) : 3005;
const PULL_INTERVAL_MS = process.env.SHEETS_PULL_INTERVAL_MS ? parseInt(process.env.SHEETS_PULL_INTERVAL_MS, 10) : 60000;

let isRunning = true;
let lastPullTime = 0;
let lastPullStatus = 'Not started';

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🚀 SAMADHAAN SYNC WORKER STARTED');
console.log(`⏰ Pull Interval: ${PULL_INTERVAL_MS / 1000}s`);
console.log(`🩺 Health Server Port: ${HEALTH_PORT}`);
console.log('═══════════════════════════════════════════════════════════════════');

// 1. Push Sync Queue Consumer (every 3 seconds)
setInterval(async () => {
  if (!isRunning) return;
  try {
    await flushSheetsQueue();
  } catch (err: any) {
    console.error('[Worker Push] Error flushing queue:', err.message);
  }
}, 3000);

// 2. Pull Sync Polling Worker (every 60 seconds)
async function runPullCycle() {
  if (!isRunning) return;
  try {
    lastPullTime = Date.now();
    const states = ['Maharashtra', 'Gujarat', 'Jammu & Kashmir', 'Madhya Pradesh', 'Goa', 'Mizoram', 'Uttarakhand'];
    for (const state of states) {
      await pollSheetsForChanges(state);
    }
    lastPullStatus = 'Healthy';
  } catch (err: any) {
    console.error('[Worker Pull] Error in pull cycle:', err.message);
    lastPullStatus = `Error: ${err.message}`;
  } finally {
    if (isRunning) {
      setTimeout(runPullCycle, PULL_INTERVAL_MS);
    }
  }
}

setTimeout(runPullCycle, 5000);

// 3. Health Check HTTP Server
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'UP',
        service: 'samadhaan-sync-worker',
        lastPullTime: lastPullTime ? new Date(lastPullTime).toISOString() : null,
        lastPullStatus,
        uptime: process.uptime(),
      })
    );
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(HEALTH_PORT, '127.0.0.1', () => {
  console.log(`[Worker] Health server listening on http://127.0.0.1:${HEALTH_PORT}/health`);
});

process.on('SIGTERM', () => {
  console.log('[Worker] Received SIGTERM. Shutting down gracefully...');
  isRunning = false;
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[Worker] Received SIGINT. Shutting down gracefully...');
  isRunning = false;
  server.close(() => process.exit(0));
});
