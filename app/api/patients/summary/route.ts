import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server-admin';
import { 
  validateAndExtractScope, 
  buildScopedQuery, 
  logApiRequest, 
  logApiResponse,
  validateDateFilter,
  getFirstDayOfMonth,
  type PatientFilters 
} from '@/lib/api/patients-scope';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

interface SummaryResponse {
  total: number;
  pending: number;
  alertsThisMonth: number;
  screenedThisMonth: number;
  suspected: number;
  diagnosed: number;
  onTreatment: number;
  todayScreened: number;
  todaySuspected: number;
  todayDiagnosed: number;
  todayPending: number;
  meta: {
    role: string;
    scope: string;
    durationMs: number;
    cached: boolean;
  };
}

/**
 * GET /api/patients/summary - Server-computed aggregate metrics
 * 
 * Optimizations:
 * - Only selects 'id' column for counts (minimal payload)
 * - Uses shared RBAC/filter utility (no duplication)
 * - Parallel query execution
 * - Structured logging (no PII)
 * - 60s cache with stale-while-revalidate
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Validate auth and extract RBAC scope
    const scope = await validateAndExtractScope();

    const { searchParams } = new URL(request.url);
    
    // Parse and validate user filters
    let filters: PatientFilters;
    try {
      filters = {
        state: searchParams.get('state') || undefined,
        district: searchParams.get('district') || undefined,
        dateFrom: validateDateFilter(searchParams.get('dateFrom'), 'dateFrom'),
        dateTo: validateDateFilter(searchParams.get('dateTo'), 'dateTo'),
        facilityType: searchParams.get('facilityType') || undefined,
        suspected: searchParams.get('suspected') || undefined,
        tbDiagnosed: searchParams.get('tbDiagnosed') || undefined,
        treatmentStatus: searchParams.get('treatmentStatus') || undefined,
        search: searchParams.get('search') || undefined,
      };
      
      // Validate date range logic
      if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
        return NextResponse.json({
          error: 'Invalid date range',
          message: 'dateFrom must be before or equal to dateTo'
        }, { status: 400 });
      }
    } catch (err) {
      return NextResponse.json({
        error: 'Invalid parameters',
        message: err instanceof Error ? err.message : 'Parameter validation failed'
      }, { status: 400 });
    }
    
    // Structured logging
    logApiRequest('/api/patients/summary', scope, {
      filters: Object.entries(filters)
        .filter(([_, v]) => v !== undefined)
        .map(([k]) => k)
    });
    
    const supabase = createServerClient();

    /**
     * Build base query with RBAC + user filters
     * OPTIMIZATION: select('id') only - minimal payload for counting
     * Reuse this function to avoid duplication
     */
    const buildCountQuery = () => {
      const query = supabase
        .from('patients')
        .select('id', { count: 'exact', head: true });
      
      return buildScopedQuery(query, scope, filters);
    };

    // Execute aggregation queries in parallel
    const firstDayOfMonth = getFirstDayOfMonth();
    // Use local timezone for today's date
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    
    const [
      totalResult,
      pendingResult,
      alertsResult,
      screenedThisMonthResult,
      suspectedResult,
      diagnosedResult,
      onTreatmentResult,
      todayScreenedResult,
      todaySuspectedResult,
      todayDiagnosedResult,
      todayPendingResult
    ] = await Promise.all([
      // Total count
      buildCountQuery(),
      
      // Pending (no referral date)
      buildCountQuery().is('referral_date', null),
      
      // Alerts this month (screening date this month, no diagnosis)
      buildCountQuery()
        .gte('screening_date', firstDayOfMonth)
        .is('tb_diagnosed', null),
      
      // Screened this month
      buildCountQuery()
        .gte('screening_date', firstDayOfMonth),
      
      // Suspected (xray abnormal)
      buildCountQuery()
        .or('xray_result.ilike.%abnormal%,xray_result.ilike.%suspected%'),
      
      // Diagnosed (TB positive)
      buildCountQuery()
        .eq('tb_diagnosed', 'Yes'),
      
      // On treatment (ATT started)
      buildCountQuery()
        .not('att_start_date', 'is', null),
        
      // Today Screened (date range to handle timestamps)
      buildCountQuery()
        .gte('screening_date', todayStr)
        .lt('screening_date', tomorrowStr),
        
      // Today Suspected (date range to handle timestamps)
      buildCountQuery()
        .gte('screening_date', todayStr)
        .lt('screening_date', tomorrowStr)
        .or('xray_result.ilike.%abnormal%,xray_result.ilike.%suspected%,chest_x_ray_result.ilike.%abnormal%,chest_x_ray_result.ilike.%suspected%'),
        
      // Today Diagnosed (date range to handle timestamps)
      buildCountQuery()
        .gte('screening_date', todayStr)
        .lt('screening_date', tomorrowStr)
        .eq('tb_diagnosed', 'Yes'),
        
      // Today Pending (no referral, not diagnosed - date range to handle timestamps)
      buildCountQuery()
        .gte('screening_date', todayStr)
        .lt('screening_date', tomorrowStr)
        .or('tb_diagnosed.is.null,tb_diagnosed.not.eq.Yes')
        .is('referral_date', null)
    ]);

    const durationMs = Date.now() - startTime;
    
    const summary: SummaryResponse = {
      total: totalResult.count || 0,
      pending: pendingResult.count || 0,
      alertsThisMonth: alertsResult.count || 0,
      screenedThisMonth: screenedThisMonthResult.count || 0,
      suspected: suspectedResult.count || 0,
      diagnosed: diagnosedResult.count || 0,
      onTreatment: onTreatmentResult.count || 0,
      todayScreened: todayScreenedResult.count || 0,
      todaySuspected: todaySuspectedResult.count || 0,
      todayDiagnosed: todayDiagnosedResult.count || 0,
      todayPending: todayPendingResult.count || 0,
      meta: {
        role: scope.role,
        scope: scope.sessionState || 'national',
        durationMs,
        cached: false
      }
    };

    // Structured logging (no PII)
    logApiResponse('/api/patients/summary', durationMs, {
      status: 'success',
      total: summary.total,
      role: scope.role,
      scope: scope.sessionState || 'national'
    });

    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
        'X-Duration-Ms': String(durationMs),
        'X-Scope': scope.sessionState || 'national'
      }
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    
    // Handle auth errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    logApiResponse('/api/patients/summary', durationMs, {
      status: 'exception',
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Failed to compute summary metrics'
    }, { status: 500 });
  }
}
