/**
 * FILTERS API - Lightweight endpoint for available states and districts
 * 
 * Returns distinct state/district values without fetching all patient data.
 * Used by the filter dropdowns on the Vertex dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';
import { normalizeRole, Role } from '@/lib/constants/roles';
import { getRedisClient } from '@/lib/redis';
import { CacheNamespace, buildVersionedKey } from '@/lib/cache-version';

export const maxDuration = 15;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function applyRBACFilters(query: any, role: typeof Role[keyof typeof Role], state?: string | null, staffName?: string | null) {
  if (role === Role.ADMIN || role === Role.PROGRAM_MANAGER) {
    return query;
  } else if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
    if (state && state !== 'All') {
      if (state === 'Maharashtra') {
        query = query.in('screening_state', ['Maharashtra', 'Mumbai']);
      } else {
        query = query.eq('screening_state', state);
      }
    }
  } else if (role === Role.PRISON_COORDINATOR) {
    if (staffName) {
      query = query.ilike('staff_name', staffName.trim());
    }
  }
  return query;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawRole = session.user.role ?? 'ME';
    const role = normalizeRole(rawRole) ?? Role.ME_OFFICER;
    const state = session.user.state;
    const staffName = (session.user as any).staffName;

    // Check Redis cache
    const cacheKey = await buildVersionedKey(
      CacheNamespace.VERTEX_METRICS,
      'filters',
      rawRole
    );

    const redis = getRedisClient();
    if (redis) {
      try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          return NextResponse.json({
            ...(cachedData as any),
            meta: { ...(cachedData as any).meta, cached: true, durationMs: Date.now() - startTime },
          });
        }
      } catch (err) {
        console.error('[vertex/filters] Redis read error:', err);
      }
    }

    const supabase = createServerClient();

    // Fetch distinct states
    let stateQuery = supabase
      .from('patients')
      .select('screening_state')
      .not('screening_state', 'is', null);

    stateQuery = applyRBACFilters(stateQuery, role, state, staffName);

    const { data: stateData, error: stateError } = await stateQuery;

    if (stateError) throw stateError;

    // Fetch distinct districts
    let districtQuery = supabase
      .from('patients')
      .select('screening_district')
      .not('screening_district', 'is', null);

    districtQuery = applyRBACFilters(districtQuery, role, state, staffName);

    const { data: districtData, error: districtError } = await districtQuery;

    if (districtError) throw districtError;

    const availableStates = Array.from(new Set((stateData || []).map((r: any) => r.screening_state))).sort();
    const availableDistricts = Array.from(new Set((districtData || []).map((r: any) => r.screening_district))).sort();

    const result = {
      availableStates,
      availableDistricts,
      meta: {
        cached: false,
        durationMs: Date.now() - startTime,
      },
    };

    // Cache in Redis (5min TTL - filters change rarely)
    if (redis) {
      try {
        await redis.set(cacheKey, result, { ex: 300 });
      } catch (err) {
        console.error('[vertex/filters] Redis write error:', err);
      }
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[vertex/filters] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
