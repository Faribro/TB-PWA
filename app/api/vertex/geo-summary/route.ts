/**
 * GEO SUMMARY API - Pre-aggregated geography hierarchy for a date
 * 
 * Returns state → district → facility grouping with patient counts,
 * avoiding the need to fetch all patients client-side.
 * 
 * Redis-cached with 30s TTL.
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

interface FacilitySummary {
  facilityName: string;
  patientCount: number;
  pendingCount: number;
}

interface DistrictSummary {
  districtName: string;
  totalPatients: number;
  facilities: FacilitySummary[];
}

interface StateSummary {
  stateName: string;
  totalPatients: number;
  districts: DistrictSummary[];
}

interface GeoSummaryResponse {
  geoSummary: StateSummary[];
  meta: {
    cached: boolean;
    durationMs: number;
    totalStates: number;
    totalDistricts: number;
    totalFacilities: number;
  };
}

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

function applyFilterParams(query: any, filterState?: string, filterDistrict?: string) {
  if (filterState && filterState !== 'all') {
    if (filterState === 'Maharashtra') {
      query = query.in('screening_state', ['Maharashtra', 'Mumbai']);
    } else {
      query = query.eq('screening_state', filterState);
    }
  }
  if (filterDistrict && filterDistrict !== 'all') {
    query = query.eq('screening_district', filterDistrict);
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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const filterState = searchParams.get('state') || undefined;
    const filterDistrict = searchParams.get('district') || undefined;

    if (!date) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    const rawRole = session.user.role ?? 'ME';
    const role = normalizeRole(rawRole) ?? Role.ME_OFFICER;
    const state = session.user.state;
    const staffName = (session.user as any).staffName;

    // Check Redis cache
    const cacheKey = await buildVersionedKey(
      CacheNamespace.VERTEX_DAILY,
      'geo',
      date,
      filterState || 'all',
      filterDistrict || 'all',
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
        console.error('[vertex/geo-summary] Redis read error:', err);
      }
    }

    // Fetch patients for this date with minimal columns
    const supabase = createServerClient();
    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let page = 0;
    let totalCount = 0;

    while (page < 50) {
      const start = page * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      let query = supabase
        .from('patients')
        .select('screening_state, screening_district, facility_name, referral_date', { count: page === 0 ? 'exact' : null })
        .eq('screening_date', date)
        .range(start, end);

      query = applyRBACFilters(query, role, state, staffName);
      query = applyFilterParams(query, filterState, filterDistrict);

      const { data: pageData, error, count } = await query;

      if (error) throw error;
      if (page === 0 && count) totalCount = count;

      const rowsThisPage = pageData?.length || 0;
      allData = allData.concat(pageData || []);

      if (rowsThisPage === 0) break;
      if (totalCount > 0 && allData.length >= totalCount) break;
      if (rowsThisPage < PAGE_SIZE) break;

      page++;
    }

    // Aggregate into hierarchy
    const stateMap = new Map<string, Map<string, Map<string, { patientCount: number; pendingCount: number }>>>();

    for (const record of allData) {
      if (!record) continue;
      const st = record.screening_state || 'Unknown State';
      const dist = record.screening_district || 'Unknown District';
      const fac = record.facility_name || 'Unknown Facility';
      const isPending = !record.referral_date;

      let districtMap = stateMap.get(st);
      if (!districtMap) {
        districtMap = new Map();
        stateMap.set(st, districtMap);
      }

      let facilityMap = districtMap.get(dist);
      if (!facilityMap) {
        facilityMap = new Map();
        districtMap.set(dist, facilityMap);
      }

      let facData = facilityMap.get(fac);
      if (!facData) {
        facData = { patientCount: 0, pendingCount: 0 };
        facilityMap.set(fac, facData);
      }

      facData.patientCount++;
      if (isPending) facData.pendingCount++;
    }

    // Build response sorted by patient count descending
    const geoSummary: StateSummary[] = [];
    let totalDistricts = 0;
    let totalFacilities = 0;

    for (const [stateName, districtMap] of stateMap) {
      const districts: DistrictSummary[] = [];
      let stateTotal = 0;

      for (const [districtName, facilityMap] of districtMap) {
        const facilities: FacilitySummary[] = [];
        let districtTotal = 0;

        for (const [facilityName, facData] of facilityMap) {
          facilities.push({
            facilityName,
            patientCount: facData.patientCount,
            pendingCount: facData.pendingCount,
          });
          districtTotal += facData.patientCount;
          totalFacilities++;
        }

        // Sort facilities by patient count descending
        facilities.sort((a, b) => b.patientCount - a.patientCount);

        districts.push({
          districtName,
          totalPatients: districtTotal,
          facilities,
        });

        stateTotal += districtTotal;
        totalDistricts++;
      }

      // Sort districts by patient count descending
      districts.sort((a, b) => b.totalPatients - a.totalPatients);

      geoSummary.push({
        stateName,
        totalPatients: stateTotal,
        districts,
      });
    }

    // Sort states by patient count descending
    geoSummary.sort((a, b) => b.totalPatients - a.totalPatients);

    const result: GeoSummaryResponse = {
      geoSummary,
      meta: {
        cached: false,
        durationMs: Date.now() - startTime,
        totalStates: geoSummary.length,
        totalDistricts,
        totalFacilities,
      },
    };

    // Cache in Redis
    if (redis) {
      try {
        await redis.set(cacheKey, result, { ex: 30 });
      } catch (err) {
        console.error('[vertex/geo-summary] Redis write error:', err);
      }
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[vertex/geo-summary] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
