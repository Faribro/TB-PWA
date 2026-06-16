/**
 * app/api/ai/match/route.ts
 *
 * API endpoint for AI-powered patient matching using OpenRouter.
 * Used as a fallback when rule-based scoring is ambiguous.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  callOpenRouterMatch,
  type AIMatchRequest,
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
        { error: 'Forbidden — Only PM, admin, SPM, and M&E roles can use AI matching' },
        { status: 403 },
      );
    }

    const body = (await request.json()) as AIMatchRequest;

    // Validate required fields
    if (!body.extractedName || !body.candidateName) {
      return NextResponse.json(
        { error: 'extractedName and candidateName are required' },
        { status: 400 },
      );
    }

    // Call OpenRouter AI
    const result = await callOpenRouterMatch(body);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[AI Match] Error:', error);
    return NextResponse.json(
      {
        error: 'AI matching failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
