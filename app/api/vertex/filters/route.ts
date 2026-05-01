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

    // Batch fetch approach to get ALL unique states and districts
    const batchSize = 1000;
    const allStates = new Set<string>();
    const allDistricts = new Set<string>();
    let offset = 0;
    let hasMore = true;

    console.log('[vertex/filters] Starting batch fetch for states/districts...');

    while (hasMore) {
      let query = supabase
        .from('patients')
        .select('screening_state, screening_district')
        .not('screening_state', 'is', null)
        .range(offset, offset + batchSize - 1);

      query = applyRBACFilters(query, role, state, staffName);

      const { data, error } = await query;

      if (error) {
        console.error('[vertex/filters] Batch query error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      data.forEach((row: any) => {
        if (row.screening_state) allStates.add(row.screening_state);
        if (row.screening_district) allDistricts.add(row.screening_district);
      });

      console.log(`[vertex/filters] Batch ${Math.floor(offset / batchSize) + 1}: ${data.length} rows, States: ${allStates.size}, Districts: ${allDistricts.size}`);

      if (data.length < batchSize) {
        hasMore = false;
      } else {
        offset += batchSize;
      }

      if (offset > 100000) {
        console.warn('[vertex/filters] Safety limit reached');
        hasMore = false;
      }
    }

    const availableStates = Array.from(allStates).sort();
    const availableDistricts = Array.from(allDistricts).sort();

    console.log(`[vertex/filters] ✅ Final: ${availableStates.length} states, ${availableDistricts.length} districts`);
    console.log(`[vertex/filters] States: ${availableStates.join(', ')}`);

    const result = {
      availableStates,
      availableDistricts,
      meta: {
        cached: false,
        durationMs: Date.now() - startTime,
        stateCount: availableStates.length,
        districtCount: availableDistricts.length,
        rowsProcessed: offset,
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
