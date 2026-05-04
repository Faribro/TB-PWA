// ═══════════════════════════════════════════════════════════════════════════
// SERVER INSTRUMENTATION - INITIALIZE BACKGROUND SERVICES
// ═══════════════════════════════════════════════════════════════════════════
// This file runs once when the Next.js server starts
// Use it to initialize queues, cron jobs, and other background services
// ═══════════════════════════════════════════════════════════════════════════

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSheetsQueue } = await import('./lib/sheetsSyncQueue');
    
    try {
      initSheetsQueue();
      console.log('[Instrumentation] ✅ Google Sheets sync queue initialized');
    } catch (error) {
      console.error('[Instrumentation] ❌ Failed to initialize sheets queue:', error);
    }
  }
}
