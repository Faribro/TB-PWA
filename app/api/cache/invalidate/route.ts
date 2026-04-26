import { NextRequest, NextResponse } from 'next/server';
import { invalidatePatientCaches } from '@/lib/cache-version';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cache/invalidate
 * 
 * Invalidates all patient-related caches by bumping version keys.
 * Called by:
 * - Realtime subscriptions on patient mutations
 * - Webhook handlers
 * - Manual admin triggers
 */
export async function POST(request: NextRequest) {
  try {
    await invalidatePatientCaches();
    
    console.log('[cache/invalidate] ✅ All patient caches invalidated');
    
    return NextResponse.json({ 
      success: true,
      message: 'Cache invalidated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[cache/invalidate] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to invalidate cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
