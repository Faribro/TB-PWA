export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/linelist/count
 *
 * Lightweight read-only count endpoint for paste validation.
 * Returns the number of existing patient records for a given
 * screening_date + screening_state + screening_district combination.
 *
 * Query params:
 *   screening_date  (required) — ISO date string, e.g. "2025-04-11"
 *   state           (required) — maps to patients.screening_state
 *   district        (required) — maps to patients.screening_district
 *
 * Response:
 *   { existing_count: number, screening_date: string, state: string, district: string }
 *
 * Must respond in < 200ms. Backed by the @@index([screening_date]) index
 * defined in prisma/schema.prisma.
 */
export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    const screeningDate = searchParams.get('screening_date');
    const state = searchParams.get('state');
    const district = searchParams.get('district');

    // All three params are required
    if (!screeningDate || !state || !district) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required params: screening_date, state, district',
        },
        { status: 400 }
      );
    }

    // Parse and validate the date
    const parsedDate = new Date(screeningDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid screening_date format' },
        { status: 400 }
      );
    }

    // Use exact Prisma field names from schema.prisma:
    //   screening_state    (not "state")
    //   screening_district (not "district")
    const existing_count = await prisma.patients.count({
      where: {
        screening_date: parsedDate,
        screening_state: state,
        screening_district: district,
      },
    });

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      existing_count,
      screening_date: screeningDate,
      state,
      district,
      _durationMs: durationMs,
    });
  } catch (error: any) {
    console.error('[API /linelist/count] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
