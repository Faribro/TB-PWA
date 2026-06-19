export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { analyzeDistrictWithGemini } from '@/lib/geminiMapAnalyzer';
import { sanitizeForAI, validateSanitization } from '@/utils/dataSanitizer';
import { auth } from '@/auth';
import { getSessionScope } from '@/lib/session-scope';

// ✅ Add simple in-memory rate limit (no Redis needed for start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 }); // 1 min window
    return true;
  }
  if (entry.count >= 10) return false; // Max 10 AI calls/min per user
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth & Scope Guard ──────────────────────────────────────
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: 'Forbidden: No scope' }, { status: 403 });
    }

    const userId = (session.user as any)?.id ?? request.headers.get('x-forwarded-for') ?? 'anonymous';
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait 1 minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { command, district, allDistricts } = body;

    if (!district) {
      return NextResponse.json(
        { error: 'District data required' },
        { status: 400 }
      );
    }

    // ── Cross-State Ownership Check ─────────────────────────────
    const requestedState = district?.state || district?.screening_state || null;
    const requestedDistrict = district?.district || district?.screening_district || null;

    if (scope.role !== 'PM') {
      if (scope.state && requestedState && requestedState !== scope.state) {
        return NextResponse.json(
          { error: 'Unauthorized Cross-State Access' },
          { status: 403 }
        );
      }
      if (scope.district && requestedDistrict && requestedDistrict !== scope.district) {
        return NextResponse.json(
          { error: 'Unauthorized Cross-District Access' },
          { status: 403 }
        );
      }
    }
    // ── End Guard ────────────────────────────────────────────────

    // PII Shield: Sanitize data before sending to AI
    const sanitizedDistrict = sanitizeForAI(district);
    const sanitizedAllDistricts = sanitizeForAI(allDistricts || [district]);

    // Validate sanitization
    const validation = validateSanitization({
      district: sanitizedDistrict,
      allDistricts: sanitizedAllDistricts
    });

    if (!validation.valid) {
      // CRITICAL: PII leak prevented

      console.error('❌ PII Shield: Sanitization failed', validation.violations);
      return NextResponse.json(
        { error: 'Data sanitization failed' },
        { status: 400 }
      );
    }

    const context = {
      command,
      districtData: sanitizedAllDistricts,
      selectedDistrict: sanitizedDistrict.district,
      activeMetric: 'breaches'
    };

    const analysis = await analyzeDistrictWithGemini(context);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('District analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
