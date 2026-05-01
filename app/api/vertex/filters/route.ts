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

    // Industry best practice: Batch pagination to handle large datasets
    const BATCH_SIZE = 1000;
    const MAX_ROWS = 100000;
    const statesSet = new Set<string>();
    const districtsSet = new Set<string>();
    
    let offset = 0;
    let hasMoreData = true;
    let totalRowsProcessed = 0;

    console.log('[vertex/filters] Starting paginated fetch...');

    while (hasMoreData && offset < MAX_ROWS) {
      let query = supabase
        .from('patients')
        .select('screening_state, screening_district')
        .not('screening_state', 'is', null)
        .range(offset, offset + BATCH_SIZE - 1);

      query = applyRBACFilters(query, role, state, staffName);

      const { data, error } = await query;

      if (error) {
        console.error('[vertex/filters] Query error at offset', offset, error);
        throw error;
      }

      if (!data || data.length === 0) {
        hasMoreData = false;
        break;
      }

      data.forEach((row: any) => {
        // Normalize state names to title case to avoid duplicates (Uttarakhand vs uttarakhand)
        if (row.screening_state) {
          const normalizedState = row.screening_state
            .toLowerCase()
            .split('_')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          statesSet.add(normalizedState);
        }
        if (row.screening_district) {
          const normalizedDistrict = row.screening_district
            .toLowerCase()
            .split('_')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          districtsSet.add(normalizedDistrict);
        }
      });

      totalRowsProcessed += data.length;
      console.log(`[vertex/filters] Batch ${Math.floor(offset / BATCH_SIZE) + 1}: +${data.length} rows | Total: ${totalRowsProcessed} | States: ${statesSet.size} | Districts: ${districtsSet.size}`);

      if (data.length < BATCH_SIZE) {
        hasMoreData = false;
      } else {
        offset += BATCH_SIZE;
      }
    }

    const availableStates = Array.from(statesSet).sort();
    const availableDistricts = Array.from(districtsSet).sort();

    console.log(`[vertex/filters] ✅ Complete: ${availableStates.length} states, ${availableDistricts.length} districts from ${totalRowsProcessed} rows`);
    console.log(`[vertex/filters] States found: ${availableStates.join(', ')}`);

    const result = {
      availableStates,
      availableDistricts,
      meta: {
        cached: false,
        durationMs: Date.now() - startTime,
        stateCount: availableStates.length,
        districtCount: availableDistricts.length,
        rowsProcessed: totalRowsProcessed,
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
