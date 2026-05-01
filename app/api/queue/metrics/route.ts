// ═══════════════════════════════════════════════════════════════════════════
// QUEUE METRICS API
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { getQueueMetrics, retryFailedJobs, clearCompletedJobs } from '@/lib/sheetsSyncQueue';

export async function GET() {
  try {
    const metrics = await getQueueMetrics();
    return NextResponse.json({ success: true, metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === 'retry') {
      const count = await retryFailedJobs();
      return NextResponse.json({ success: true, message: `Retried ${count} jobs` });
    }

    if (action === 'clear') {
      const count = await clearCompletedJobs();
      return NextResponse.json({ success: true, message: `Cleared ${count} jobs` });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
