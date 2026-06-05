import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { normalizeRole, Role } from '@/lib/constants/roles';
import { getCachedWithMemory } from '@/lib/memory-cache';
import { CacheNamespace, buildVersionedKey, bumpCacheVersion } from '@/lib/cache-version';
import { prisma } from '@/lib/prisma';

// Version 2.1.0 - Refactored to utilize mv_daily_vertex_metrics materialized view
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
    const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString(), 10);
    const month = parseInt(searchParams.get('month') ?? (new Date().getMonth() + 1).toString(), 10);
    
    // Validate year is not too far in future
    const currentYear = new Date().getFullYear();
    if (year > currentYear + 1) {
      return NextResponse.json({
        screened: 0,
        suspected: 0,
        diagnosed: 0,
        attStarted: 0,
        referred: 0,
        dailyBreakdown: [],
        _meta: { year, month, view: searchParams.get('view') ?? 'month', error: 'Future date' }
      });
    }
    const view = searchParams.get('view') ?? 'month'; // 'month' or 'year'

    // Optional state/district filters from query params
    const filterState = searchParams.get('state');
    const filterDistrict = searchParams.get('district');

    // Generate VERSIONED cache key
    const cacheKey = await buildVersionedKey(
      CacheNamespace.VERTEX_METRICS,
      view,
      String(year),
      String(month),
      filterState || 'all',
      filterDistrict || 'all',
      session.user.role || 'ME',
      session.user.state || 'all'
    );

    // Apply RBAC filters
    const rawRole = session.user.role ?? 'ME';
    const role = normalizeRole(rawRole) ?? Role.ME_OFFICER;
    const state = session.user.state;

    // Try three-layer cache (Memory → Redis → Database)
    const responseData = await getCachedWithMemory(
      cacheKey,
      async () => {
        let startDate: string;
        let endDate: string;

        if (view === 'year') {
          startDate = `${year}-01-01`;
          endDate = `${year}-12-31`;
        } else {
          const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          startDate = monthStart;
          endDate = monthEnd;
        }

        // Base query selecting summaries from materialized view
        let queryStr = `
          SELECT 
            registration_date::text AS date,
            SUM(screened_count)::integer AS count,
            SUM(suspected_count)::integer AS suspected,
            SUM(diagnosed_count)::integer AS "tbPositive",
            SUM(att_started_count)::integer AS "attStarted",
            SUM(referred_count)::integer AS referred
          FROM public.mv_daily_vertex_metrics
          WHERE registration_date >= $1::date AND registration_date <= $2::date
        `;

        const params: any[] = [startDate, endDate];

        // Determine state filter
        let targetState: string | null = null;
        if (filterState && filterState !== 'all') {
          targetState = filterState;
        } else if ((role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) && state && state !== 'All') {
          targetState = state;
        }

        if (targetState) {
          if (targetState.toLowerCase() === 'maharashtra') {
            queryStr += ` AND LOWER(screening_state) IN ('maharashtra', 'mumbai')`;
          } else {
            params.push(targetState);
            queryStr += ` AND LOWER(screening_state) = LOWER($${params.length})`;
          }
        }

        // Determine district filter
        if (filterDistrict && filterDistrict !== 'all') {
          params.push(filterDistrict);
          queryStr += ` AND LOWER(screening_district) = LOWER($${params.length})`;
        }

        // Add group by and order by
        queryStr += `
          GROUP BY registration_date
          ORDER BY registration_date ASC
        `;

        // Execute raw query using global Prisma client
        const dbRows = await prisma.$queryRawUnsafe<any[]>(queryStr, ...params);

        // Aggregate totals and build breakdown
        let totalScreened = 0;
        let totalSuspected = 0;
        let totalDiagnosed = 0;
        let totalAttStarted = 0;
        let totalReferred = 0;

        const dailyBreakdown: DailyStats[] = dbRows.map((row: any) => {
          const count = Number(row.count || 0);
          const suspected = Number(row.suspected || 0);
          const tbPositive = Number(row.tbPositive || 0);
          const attStarted = Number(row.attStarted || 0);
          const referred = Number(row.referred || 0);

          totalScreened += count;
          totalSuspected += suspected;
          totalDiagnosed += tbPositive;
          totalAttStarted += attStarted;
          totalReferred += referred;

          return {
            date: row.date,
            count,
            tbPositive: tbPositive,
            suspected,
            attStarted,
            referred
          };
        });

        return {
          screened: totalScreened,
          suspected: totalSuspected,
          diagnosed: totalDiagnosed,
          attStarted: totalAttStarted,
          referred: totalReferred,
          dailyBreakdown,
          _meta: {
            year,
            ...(view !== 'year' && { month }),
            view,
            startDate,
            endDate,
            role,
            state: state || null,
            totalRecords: dbRows.length
          }
        };
      },
      30
    );

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Cache': 'MULTI-LAYER'
      }
    });
  } catch (error) {
    console.error('[/api/vertex/metrics] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
