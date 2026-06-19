import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';
import { normalizeRole, Role } from '@/lib/constants/roles';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    
    // Normalize role for RBAC
    const rawRole = session.user.role ?? 'ME';
    const role = normalizeRole(rawRole) ?? Role.ME_OFFICER;
    const state = session.user.state;
    const district = (session.user as any).district;
    const staffName = (session.user as any).staffName;

    // Helper to apply filters
    const applyFilters = (query: any) => {
      if (role === Role.ADMIN || role === Role.PROGRAM_MANAGER) {
        // National tier - no filters
        return query;
      } else if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
        if (state && state !== 'All') {
          return query.eq('screening_state', state);
        }
      } else if (role === Role.PRISON_COORDINATOR) {
        if (staffName) {
          return query.ilike('staff_name', staffName.trim());
        }
      }
      return query;
    };

    // Get metrics in parallel
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      { count: total },
      { count: pending },
      { count: thisMonth },
      { count: onATT }
    ] = await Promise.all([
      applyFilters(supabase.from('patients').select('*', { count: 'exact', head: true })),
      applyFilters(supabase.from('patients').select('*', { count: 'exact', head: true })
        .eq('xray_result', 'Abnormal - Suspected')
        .is('att_start_date', null)
        .is('referral_date', null)),
      applyFilters(supabase.from('patients').select('*', { count: 'exact', head: true })
        .gte('screening_date', startOfMonth.toISOString())),
      applyFilters(supabase.from('patients').select('*', { count: 'exact', head: true })
        .not('att_start_date', 'is', null))
    ]);

    return NextResponse.json({
      total: total ?? 0,
      pending: pending ?? 0,
      thisMonth: thisMonth ?? 0,
      onATT: onATT ?? 0
    });
  } catch (error) {
    console.error('[/api/metrics] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
