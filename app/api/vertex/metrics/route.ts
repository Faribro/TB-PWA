import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';
import { normalizeRole, Role } from '@/lib/constants/roles';
import { getCachedWithMemory } from '@/lib/memory-cache';
import { CacheNamespace, buildVersionedKey, bumpCacheVersion } from '@/lib/cache-version';

// Version 2.0.2 - Bumped cache version after fixing flexible matching
export const maxDuration = 15;
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Force no caching

interface PatientRecord {
  screening_date: string;
  tb_diagnosed: string | null;
  xray_result: string | null;
  att_start_date: string | null;
  referral_date: string | null;
}

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
    const view = searchParams.get('view') ?? 'month'; // 'month' or 'year'

    // Optional state/district filters from query params (for future filter bar integration)
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
    const staffName = (session.user as any).staffName;

    const applyFilters = (query: any) => {
      // Role-based filtering
      if (role === Role.ADMIN || role === Role.PROGRAM_MANAGER) {
        // National tier - no filters
      } else if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
        if (state && state !== 'All') {
          // Maharashtra SPM sees both Maharashtra and Mumbai data
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
      
      // Query param filtering (overrides for filter bar)
      if (filterState && filterState !== 'all') {
        // Maharashtra filter includes Mumbai data
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
    };

    // Try three-layer cache (Memory → Redis → Database)
    const responseData = await getCachedWithMemory(
      cacheKey,
      async () => {
        const supabase = createServerClient();

    if (view === 'year') {
      // YEAR VIEW: Paginated fetch for full year data
      // CRITICAL: Supabase PostgREST caps at 1000 rows by default.
      // .range(0, 99999) does NOT bypass this cap — we must paginate in 1000-row chunks.
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      const PAGE_SIZE = 1000;
      let yearData: PatientRecord[] = [];
      let page = 0;
      let totalCount = 0;

      try {
        while (page < 50) { // Safety: max 50 pages (50k rows)
          const start = page * PAGE_SIZE;
          const end = start + PAGE_SIZE - 1;

          let pageQuery = supabase
            .from('patients')
            .select('screening_date, tb_diagnosed, xray_result, att_start_date, referral_date', { count: page === 0 ? 'exact' : null })
            .gte('screening_date', yearStart)
            .lte('screening_date', yearEnd)
            .not('screening_date', 'is', null)
            .order('screening_date', { ascending: true })
            .range(start, end);

          pageQuery = applyFilters(pageQuery);

          const { data: pageData, error, count } = await pageQuery;

          if (error) throw error;
          if (page === 0 && count) totalCount = count;

          const rowsThisPage = pageData?.length || 0;
          yearData = yearData.concat(pageData || []);

          console.log(`[/api/vertex/metrics] Year page ${page}: ${rowsThisPage} rows (total: ${yearData.length} / ${totalCount || '?'})`);

          if (rowsThisPage === 0) break;
          if (totalCount > 0 && yearData.length >= totalCount) break;
          if (rowsThisPage < PAGE_SIZE) break;

          page++;
        }
      } catch (yearError: any) {
        console.error('[/api/vertex/metrics] Year query error:', yearError);
        return NextResponse.json({
          error: 'Database query timeout',
          details: yearError.message,
          fallback: true
        }, {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200'
          }
        });
      }

      // Aggregate in JavaScript - O(n) single pass
      const dailyMap = new Map<string, DailyStats>();
      let totalScreened = 0;
      let totalSuspected = 0;
      let totalDiagnosed = 0;
      let totalAttStarted = 0;
      let totalReferred = 0;

      (yearData as PatientRecord[] || []).forEach((record) => {
        const date = record.screening_date;
        totalScreened++;

        // Flexible matching for xray_result (case-insensitive, multiple formats)
        const xrayLower = (record.xray_result || '').toLowerCase();
        const isSuspected = xrayLower.includes('suspected') || 
                           xrayLower.includes('abnormal') ||
                           record.xray_result === 'Suspected TB Case';
        
        // Flexible matching for tb_diagnosed (Y, Yes, yes, etc.)
        const tbLower = (record.tb_diagnosed || '').toLowerCase();
        const isDiagnosed = tbLower === 'y' || tbLower === 'yes';
        
        const isAttStarted = record.att_start_date !== null;
        const isReferred = record.referral_date !== null;

        if (isSuspected) totalSuspected++;
        if (isDiagnosed) totalDiagnosed++;
        if (isAttStarted) totalAttStarted++;
        if (isReferred) totalReferred++;

        // Daily breakdown
        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            date,
            count: 0,
            tbPositive: 0,
            suspected: 0,
            attStarted: 0,
            referred: 0
          });
        }

        const dayStats = dailyMap.get(date)!;
        dayStats.count++;
        if (isDiagnosed) dayStats.tbPositive++;
        if (isSuspected) dayStats.suspected++;
        if (isAttStarted) dayStats.attStarted++;
        if (isReferred) dayStats.referred++;
      });

      const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      
      console.log(`[/api/vertex/metrics] Year ${year}: Aggregated ${totalScreened} records into ${dailyBreakdown.length} days`);
      if (totalScreened === 1000) {
        console.warn(`[/api/vertex/metrics] ⚠️ WARNING: Exactly 1000 records - may indicate Supabase cap!`);
      }

        return {
          screened: totalScreened,
          suspected: totalSuspected,
          diagnosed: totalDiagnosed,
          attStarted: totalAttStarted,
          referred: totalReferred,
          dailyBreakdown,
          _meta: {
            year,
            view: 'year',
            yearStart,
            yearEnd,
            role,
            state: state || null,
            totalRecords: yearData?.length ?? 0
          }
        };
    } else {
      // MONTH VIEW: Paginated fetch for single month data
      // CRITICAL: Supabase PostgREST caps at 1000 rows by default.
      // .range(0, 99999) does NOT bypass this cap — we must paginate in 1000-row chunks.
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      const PAGE_SIZE = 1000;
      let monthData: PatientRecord[] = [];
      let page = 0;
      let totalCount = 0;
      
      try {
        while (page < 50) { // Safety: max 50 pages (50k rows)
          const start = page * PAGE_SIZE;
          const end = start + PAGE_SIZE - 1;

          let pageQuery = supabase
            .from('patients')
            .select('screening_date, tb_diagnosed, xray_result, att_start_date, referral_date', { count: page === 0 ? 'exact' : null })
            .gte('screening_date', monthStart)
            .lte('screening_date', monthEnd)
            .not('screening_date', 'is', null)
            .order('screening_date', { ascending: true })
            .range(start, end);

          pageQuery = applyFilters(pageQuery);

          const { data: pageData, error, count } = await pageQuery;

          if (error) throw error;
          if (page === 0 && count) totalCount = count;

          const rowsThisPage = pageData?.length || 0;
          monthData = monthData.concat(pageData || []);

          console.log(`[/api/vertex/metrics] Month page ${page}: ${rowsThisPage} rows (total: ${monthData.length} / ${totalCount || '?'})`);

          if (rowsThisPage === 0) break;
          if (totalCount > 0 && monthData.length >= totalCount) break;
          if (rowsThisPage < PAGE_SIZE) break;

          page++;
        }
      } catch (monthError: any) {
        console.error('[/api/vertex/metrics] Month query error:', monthError);
        return NextResponse.json({ 
          error: 'Database query timeout',
          details: monthError.message,
          fallback: true
        }, { 
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
          }
        });
      }
      
      // Aggregate in JavaScript
      const dailyMap = new Map<string, DailyStats>();
      let totalScreened = 0;
      let totalSuspected = 0;
      let totalDiagnosed = 0;
      let totalAttStarted = 0;
      let totalReferred = 0;
      
      (monthData as PatientRecord[] || []).forEach((record) => {
        const date = record.screening_date;
        totalScreened++;
        
        // Flexible matching for xray_result (case-insensitive, multiple formats)
        const xrayLower = (record.xray_result || '').toLowerCase();
        const isSuspected = xrayLower.includes('suspected') || 
                           xrayLower.includes('abnormal') ||
                           record.xray_result === 'Suspected TB Case';
        
        // Flexible matching for tb_diagnosed (Y, Yes, yes, etc.)
        const tbLower = (record.tb_diagnosed || '').toLowerCase();
        const isDiagnosed = tbLower === 'y' || tbLower === 'yes';
        
        const isAttStarted = record.att_start_date !== null;
        const isReferred = record.referral_date !== null;
        
        if (isSuspected) totalSuspected++;
        if (isDiagnosed) totalDiagnosed++;
        if (isAttStarted) totalAttStarted++;
        if (isReferred) totalReferred++;
        
        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            date,
            count: 0,
            tbPositive: 0,
            suspected: 0,
            attStarted: 0,
            referred: 0
          });
        }
        
        const dayStats = dailyMap.get(date)!;
        dayStats.count++;
        if (isDiagnosed) dayStats.tbPositive++;
        if (isSuspected) dayStats.suspected++;
        if (isAttStarted) dayStats.attStarted++;
        if (isReferred) dayStats.referred++;
      });
      
      const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      
      console.log(`[/api/vertex/metrics] Month ${year}-${month}: Aggregated ${totalScreened} records into ${dailyBreakdown.length} days`);
      if (totalScreened === 1000) {
        console.warn(`[/api/vertex/metrics] ⚠️ WARNING: Exactly 1000 records - may indicate Supabase cap!`);
      }

      return {
        screened: totalScreened,
        suspected: totalSuspected,
        diagnosed: totalDiagnosed,
        attStarted: totalAttStarted,
        referred: totalReferred,
        dailyBreakdown,
        _meta: {
          year,
          month,
          view: 'month',
          monthStart,
          monthEnd,
          role,
          state: state || null,
          totalRecords: monthData?.length ?? 0
        }
      };
    }
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
