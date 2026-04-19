import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';
import { normalizeRole, Role } from '@/lib/constants/roles';

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
  meta: {
    role: string;
    scope: string;
    durationMs: number;
    cached: boolean;
  };
}

/**
 * GET /api/patients/summary - Aggregate metrics only
 * Returns server-computed KPIs without fetching all records
 * Respects RBAC filtering
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') || undefined;
    const district = searchParams.get('district') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    
    const supabase = createServerClient();
    const sessionState = session.user.state;
    const staffName = (session.user as any).staffName;
    const role = normalizeRole(session.user.role) ?? Role.ME_OFFICER;

    console.log(`[patients/summary] User: ${session.user.email}, Role: ${role}`);

    // Build base query with RBAC filters
    let baseQuery = supabase.from('patients').select('*', { count: 'exact', head: false });
    
    // Apply RBAC filters
    if (role === Role.ADMIN || role === Role.PROGRAM_MANAGER) {
      // National access - no filter
    } else if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
      if (sessionState && sessionState !== 'All') {
        if (sessionState === 'Maharashtra') {
          baseQuery = baseQuery.in('screening_state', ['Maharashtra', 'Mumbai']);
        } else {
          baseQuery = baseQuery.eq('screening_state', sessionState);
        }
      }
    } else if (role === Role.PRISON_COORDINATOR) {
      if (staffName) {
        baseQuery = baseQuery.ilike('staff_name', staffName.trim());
      }
    }
    
    // Apply user filters
    if (state && state !== 'all') {
      if (state === 'Maharashtra') {
        baseQuery = baseQuery.in('screening_state', ['Maharashtra', 'Mumbai']);
      } else {
        baseQuery = baseQuery.eq('screening_state', state);
      }
    }
    
    if (district && district !== 'all') {
      baseQuery = baseQuery.eq('screening_district', district);
    }
    
    if (dateFrom) {
      baseQuery = baseQuery.gte('screening_date', dateFrom);
    }
    
    if (dateTo) {
      baseQuery = baseQuery.lte('screening_date', dateTo);
    }

    // Execute aggregation queries in parallel
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    
    const [
      totalResult,
      pendingResult,
      alertsResult,
      screenedThisMonthResult,
      suspectedResult,
      diagnosedResult,
      onTreatmentResult
    ] = await Promise.all([
      // Total count
      baseQuery.select('id', { count: 'exact', head: true }),
      
      // Pending (no referral date)
      baseQuery.select('id', { count: 'exact', head: true }).is('referral_date', null),
      
      // Alerts this month (screening date this month, no diagnosis)
      baseQuery.select('id', { count: 'exact', head: true })
        .gte('screening_date', firstDayOfMonth)
        .is('tb_diagnosed', null),
      
      // Screened this month
      baseQuery.select('id', { count: 'exact', head: true })
        .gte('screening_date', firstDayOfMonth),
      
      // Suspected (xray abnormal)
      baseQuery.select('id', { count: 'exact', head: true })
        .or('xray_result.ilike.%abnormal%,xray_result.ilike.%suspected%'),
      
      // Diagnosed (TB positive)
      baseQuery.select('id', { count: 'exact', head: true })
        .eq('tb_diagnosed', 'Yes'),
      
      // On treatment (ATT started)
      baseQuery.select('id', { count: 'exact', head: true })
        .not('att_start_date', 'is', null)
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
      meta: {
        role,
        scope: sessionState || 'national',
        durationMs,
        cached: false
      }
    };

    console.log(`[patients/summary] ✅ Computed in ${durationMs}ms:`, summary);

    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
        'X-Duration-Ms': String(durationMs)
      }
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[patients/summary] Exception:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
