/**
 * app/api/debug/openrouter/route.ts
 * 
 * Diagnostic endpoint for OpenRouter key pool health
 * Only accessible in development mode
 */

import { NextResponse } from 'next/server';
import { getKeyPoolStatus } from '@/lib/openrouter';

export async function GET() {
  // Only expose in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Disabled in production' },
      { status: 403 }
    );
  }

  const status = getKeyPoolStatus();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    ...status,
  });
}
