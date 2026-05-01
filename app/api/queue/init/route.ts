// ═══════════════════════════════════════════════════════════════════════════
// QUEUE INITIALIZATION API
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { initSheetsQueue, getQueueMetrics } from '@/lib/sheetsSyncQueue';

export async function GET() {
  try {
    initSheetsQueue();
    const metrics = await getQueueMetrics();

    return NextResponse.json({
      success: true,
      message: 'Queue initialized',
      metrics,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
