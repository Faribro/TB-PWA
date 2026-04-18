import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';
import { normalizeRole, Role } from '@/lib/constants/roles';

export const maxDuration = 15;
export const dynamic = 'force-dynamic';

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

    const supabase = createServerClient();
    
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

    if (view === 'year') {
      // YEAR VIEW: Single query for full year data
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      
      // ONE query fetches patient records for the year (limit 5k for performance)
      const queryPromise = applyFilters(
        supabase
          .from('patients')
          .select('screening_date, tb_diagnosed, xray_result, att_start_date, referral_date')
          .gte('screening_date', yearStart)
          .lte('screening_date', yearEnd)
          .not('screening_date', 'is', null)
          .limit(5000)
      );
      
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), 8000)
      );
      
      let yearData;
      try {
        const result = await Promise.race([queryPromise, timeoutPromise]);
        if (result.error) throw result.error;
        yearData = result.data;
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
        
        // Count metrics
        const isSuspected = record.xray_result === 'Suspected TB Case';
        const isDiagnosed = record.tb_diagnosed === 'Y';
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
      
      return NextResponse.json({
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
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });
    } else {
      // MONTH VIEW: Single month query (existing behavior, optimized)
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      // Single query for month data (limit 3k for performance)
      const queryPromise = applyFilters(
        supabase
          .from('patients')
          .select('screening_date, tb_diagnosed, xray_result, att_start_date, referral_date')
          .gte('screening_date', monthStart)
          .lte('screening_date', monthEnd)
          .not('screening_date', 'is', null)
          .limit(3000)
      );
      
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), 8000)
      );
      
      let monthData;
      try {
        const result = await Promise.race([queryPromise, timeoutPromise]);
        if (result.error) throw result.error;
        monthData = result.data;
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
        
        const isSuspected = record.xray_result === 'Suspected TB Case';
        const isDiagnosed = record.tb_diagnosed === 'Y';
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
      
      return NextResponse.json({
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
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
        }
      });
    }
  } catch (error) {
    console.error('[/api/vertex/metrics] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
