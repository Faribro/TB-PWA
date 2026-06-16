/**
 * PATIENTS BY DATE API - Scoped patient detail rows for a specific date
 * 
 * Returns only the patients needed for the selected-date view,
 * avoiding the need to fetch ALL patients on initial load.
 * 
 * Supports state/district/facility filters for further scoping.
 * Minimal column selection for small payload size.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';
import { normalizeRole, Role } from '@/lib/constants/roles';

export const maxDuration = 15;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Minimal columns for date-view patient lists
const DATE_VIEW_COLUMNS = [
  'id', 'unique_id', 'inmate_name', 'screening_date', 'submitted_on',
  'screening_state', 'screening_district', 'facility_name', 'facility_type',
  'xray_result', 'tb_diagnosed', 'att_start_date', 'referral_date',
  'sex', 'age', 'staff_name'
].join(',');

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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const filterState = searchParams.get('state');
    const filterDistrict = searchParams.get('district');
    const facility = searchParams.get('facility');

    if (!date) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    const rawRole = session.user.role ?? 'ME';
    const role = normalizeRole(rawRole) ?? Role.ME_OFFICER;
    const state = session.user.state;
    const staffName = (session.user as any).staffName;

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
        .select(DATE_VIEW_COLUMNS, { count: page === 0 ? 'exact' : null })
        .eq('screening_date', date)
        .order('created_at', { ascending: false })
        .range(start, end);

      query = applyRBACFilters(query, role, state, staffName);

      // Apply optional filters
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
      if (facility) {
        query = query.eq('facility_name', facility);
      }

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

    return NextResponse.json({
      data: allData,
      meta: {
        total: totalCount || allData.length,
        returned: allData.length,
        role: rawRole,
        durationMs: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('[vertex/patients-by-date] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
