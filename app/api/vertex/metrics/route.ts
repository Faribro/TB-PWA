import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { normalizeRole, Role } from '@/lib/constants/roles';
import { getCachedWithMemory } from '@/lib/memory-cache';
import { CacheNamespace, buildVersionedKey, bumpCacheVersion } from '@/lib/cache-version';
import { prisma } from '@/lib/prisma';

// Version 2.2.0 - Unified filter support: MV for defaults, raw SQL for granular sub-filters
export const maxDuration = 15;
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Force no caching

interface DailyStats {
  date: string;
  count: number;
  tbPositive: number;
  suspected: number;
  attStarted: number;
  referred: number;
}

export async function GET(request: NextRequest) {
  try {
    // Force cache invalidation to use new flexible matching logic
    await bumpCacheVersion(CacheNamespace.VERTEX_METRICS);

    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year  = parseInt(searchParams.get('year')  ?? new Date().getFullYear().toString(), 10);
    const month = parseInt(searchParams.get('month') ?? (new Date().getMonth() + 1).toString(), 10);

    console.log('[/api/vertex/metrics] Incoming request:', {
      year,
      month,
      view:        searchParams.get('view'),
      state:       searchParams.get('state'),
      district:    searchParams.get('district'),
      facilityType: searchParams.get('facilityType'),
      suspected:   searchParams.get('suspected'),
      tbDiagnosed: searchParams.get('tbDiagnosed'),
    });

    // Validate year is not too far in future
    const currentYear = new Date().getFullYear();
    if (year > currentYear + 1) {
      return NextResponse.json({
        screened: 0, suspected: 0, diagnosed: 0, attStarted: 0, referred: 0,
        dailyBreakdown: [],
        _meta: { year, month, view: searchParams.get('view') ?? 'month', error: 'Future date' }
      });
    }

    const view = searchParams.get('view') ?? 'month'; // 'month' or 'year'

    // ── Filter params ─────────────────────────────────────────────────────────
    const filterState       = searchParams.get('state')        || null;
    const filterDistrict    = searchParams.get('district')     || null;
    const filterFacilityType = searchParams.get('facilityType') || null;
    const filterSuspected   = searchParams.get('suspected')    || null;
    const filterTbDiagnosed = searchParams.get('tbDiagnosed')  || null;

    // Detect granular sub-filters that cannot be served from the materialized view
    const hasGranularFilters =
      (filterFacilityType && filterFacilityType !== 'all') ||
      (filterSuspected    && filterSuspected    !== 'all') ||
      (filterTbDiagnosed  && filterTbDiagnosed  !== 'all');

    // Apply RBAC filters
    const rawRole = session.user.role ?? 'ME';
    const role    = normalizeRole(rawRole) ?? Role.ME_OFFICER;
    const state   = session.user.state;
    const staffName = (session.user as any).staffName;

    // Generate VERSIONED cache key — includes role, state, staffName, and all filters
    const cacheKey = await buildVersionedKey(
      CacheNamespace.VERTEX_METRICS,
      view,
      String(year),
      String(month),
      filterState      || 'all',
      filterDistrict   || 'all',
      filterFacilityType || 'all',
      filterSuspected  || 'all',
      filterTbDiagnosed || 'all',
      rawRole,
      state            || 'all',
      staffName        || 'all'
    );

    // Try three-layer cache (Memory → Redis → Database)
    const responseData = await getCachedWithMemory(
      cacheKey,
      async () => {
        let startDate: string;
        let endDate: string;

        if (view === 'year') {
          startDate = `${year}-01-01`;
          endDate   = `${year}-12-31`;
        } else {
          const lastDay = new Date(year, month, 0).getDate();
          startDate = `${year}-${String(month).padStart(2, '0')}-01`;
          endDate   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        }

        // Determine the state to filter by (RBAC + user-selected filter)
        let targetState: string | null = null;
        if (filterState && filterState !== 'all') {
          targetState = filterState;
        } else if (
          (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) &&
          state && state !== 'All'
        ) {
          targetState = state;
        }

        let dbRows: any[];

        if (hasGranularFilters) {
          // ── GRANULAR PATH: bypass materialized view, query base patients table ──
          // Build raw SQL directly on `public.patients`
          let rawSql = `
            SELECT
              screening_date::text                          AS date,
              COUNT(*)::integer                             AS count,
              SUM(CASE WHEN LOWER(xray_result) LIKE '%suspected%'
                            OR LOWER(xray_result) LIKE '%abnormal%'
                       THEN 1 ELSE 0 END)::integer          AS suspected,
              SUM(CASE WHEN tb_diagnosed = 'Y'
                       THEN 1 ELSE 0 END)::integer          AS "tbPositive",
              SUM(CASE WHEN att_start_date IS NOT NULL
                       THEN 1 ELSE 0 END)::integer          AS "attStarted",
              SUM(CASE WHEN referral_date IS NOT NULL
                       THEN 1 ELSE 0 END)::integer          AS referred
            FROM public.patients
            WHERE screening_date >= $1::date
              AND screening_date <= $2::date
              AND screening_date IS NOT NULL
          `;

          const params: any[] = [startDate, endDate];

          // RBAC state filter
          if (targetState) {
            if (targetState.toLowerCase() === 'maharashtra') {
              rawSql += ` AND LOWER(screening_state) IN ('maharashtra', 'mumbai')`;
            } else {
              params.push(targetState);
              rawSql += ` AND LOWER(screening_state) = LOWER($${params.length})`;
            }
          }

          // RBAC staff_name filter for Prison Coordinators
          if (role === Role.PRISON_COORDINATOR && staffName) {
            params.push(staffName.trim());
            rawSql += ` AND LOWER(staff_name) = LOWER($${params.length})`;
          }

          // User district filter
          if (filterDistrict && filterDistrict !== 'all') {
            params.push(filterDistrict);
            rawSql += ` AND LOWER(screening_district) = LOWER($${params.length})`;
          }

          // Facility type filter
          if (filterFacilityType && filterFacilityType !== 'all') {
            params.push(filterFacilityType);
            rawSql += ` AND facility_type = $${params.length}`;
          }

          // X-Ray / Suspected filter
          if (filterSuspected && filterSuspected !== 'all') {
            if (filterSuspected === 'Yes') {
              rawSql += ` AND (LOWER(xray_result) LIKE '%suspected%' OR LOWER(xray_result) LIKE '%abnormal%')`;
            } else if (filterSuspected === 'No') {
              rawSql += ` AND LOWER(xray_result) LIKE '%normal%'`;
            } else {
              params.push(filterSuspected);
              rawSql += ` AND xray_result = $${params.length}`;
            }
          }

          // TB Diagnosed filter
          if (filterTbDiagnosed && filterTbDiagnosed !== 'all') {
            if (filterTbDiagnosed.toLowerCase() === 'pending') {
              rawSql += ` AND tb_diagnosed IS NULL`;
            } else {
              params.push(filterTbDiagnosed);
              rawSql += ` AND tb_diagnosed = $${params.length}`;
            }
          }

          rawSql += `
            GROUP BY screening_date
            ORDER BY screening_date ASC
          `;

          dbRows = await prisma.$queryRawUnsafe<any[]>(rawSql, ...params);
        } else {
          // ── DEFAULT PATH: fast materialized view query ────────────────────────
          let queryStr = `
            SELECT
              registration_date::text AS date,
              SUM(screened_count)::integer  AS count,
              SUM(suspected_count)::integer AS suspected,
              SUM(diagnosed_count)::integer AS "tbPositive",
              SUM(att_started_count)::integer AS "attStarted",
              SUM(referred_count)::integer  AS referred
            FROM public.mv_daily_vertex_metrics
            WHERE registration_date >= $1::date AND registration_date <= $2::date
          `;

          const params: any[] = [startDate, endDate];

          if (targetState) {
            if (targetState.toLowerCase() === 'maharashtra') {
              queryStr += ` AND LOWER(screening_state) IN ('maharashtra', 'mumbai')`;
            } else {
              params.push(targetState);
              queryStr += ` AND LOWER(screening_state) = LOWER($${params.length})`;
            }
          }

          if (filterDistrict && filterDistrict !== 'all') {
            params.push(filterDistrict);
            queryStr += ` AND LOWER(screening_district) = LOWER($${params.length})`;
          }

          queryStr += `
            GROUP BY registration_date
            ORDER BY registration_date ASC
          `;

          dbRows = await prisma.$queryRawUnsafe<any[]>(queryStr, ...params);
        }

        // Aggregate totals and build daily breakdown
        let totalScreened  = 0;
        let totalSuspected = 0;
        let totalDiagnosed = 0;
        let totalAttStarted = 0;
        let totalReferred  = 0;

        const dailyBreakdown: DailyStats[] = dbRows.map((row: any) => {
          const count      = Number(row.count      || 0);
          const suspected  = Number(row.suspected  || 0);
          const tbPositive = Number(row.tbPositive || 0);
          const attStarted = Number(row.attStarted || 0);
          const referred   = Number(row.referred   || 0);

          totalScreened   += count;
          totalSuspected  += suspected;
          totalDiagnosed  += tbPositive;
          totalAttStarted += attStarted;
          totalReferred   += referred;

          return { date: row.date, count, tbPositive, suspected, attStarted, referred };
        });

        return {
          screened:  totalScreened,
          suspected: totalSuspected,
          diagnosed: totalDiagnosed,
          attStarted: totalAttStarted,
          referred:  totalReferred,
          dailyBreakdown,
          _meta: {
            year,
            ...(view !== 'year' && { month }),
            view,
            startDate,
            endDate,
            role,
            state: state || null,
            totalRecords: dbRows.length,
            path: hasGranularFilters ? 'raw-sql' : 'materialized-view',
          },
        };
      },
      30
    );

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Cache': 'MULTI-LAYER',
      },
    });
  } catch (error) {
    console.error('[/api/vertex/metrics] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
