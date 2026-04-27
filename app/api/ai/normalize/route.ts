/**
 * app/api/ai/normalize/route.ts
 *
 * API endpoint for AI-powered name normalization using OpenRouter.
 * Used to standardize names before matching.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  callOpenRouterNormalize,
  type AINormalizeRequest,
} from '@/lib/ai/openRouterMatcher';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ALLOWED_ROLES = ['PM', 'admin', 'SPM', 'MandE'];
    const userRole = (session.user as any).role ?? '';
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden — Only PM, admin, SPM, and M&E roles can use AI normalization' },
        { status: 403 },
      );
    }

    const body = (await request.json()) as AINormalizeRequest;

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 },
      );
    }

    // Call OpenRouter AI
    const result = await callOpenRouterNormalize(body);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[AI Normalize] Error:', error);
    return NextResponse.json(
      {
        error: 'AI normalization failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
