import { initSheetsQueue } from '@/lib/sheetsSyncQueue';

// Initialize queue on server startup
if (typeof window === 'undefined') {
  try {
    initSheetsQueue();
    console.log('[QueueInit] ✅ Sheets sync queue initialized');
  } catch (error) {
    console.error('[QueueInit] ❌ Failed to initialize queue:', error);
  }
}

export default function QueueInitializer() {
  return null;
}
