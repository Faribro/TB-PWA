import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';
import { normalizeRole, Role } from '@/lib/constants/roles';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Column selection - only fetch what we need for UI
// Reduces payload from ~4KB/row to ~400B/row = 10× faster
const SELECTED_COLUMNS = [
  'id', 'unique_id', 'inmate_name', 'screening_date', 'submitted_on',
  'screening_state', 'screening_district', 'facility_name',
  'facility_type', 'xray_result', 'tb_diagnosed', 'tb_type',
  'att_start_date', 'referral_date', 'referred_facility',
  'hiv_status', 'sex', 'age', 'created_at', 'kobo_uuid',
  'ai_link_status', 'nikshay_abha_id'
].join(',');

interface PatientsResponse {
  data: any[];
  meta: {
    total: number;
    returned: number;
    limit: number;
    role: string;
    batches: number;
    durationMs: number;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const requestedPageSizeStr = searchParams.get('pageSize');
    
    // Extract filter params
    const filterState = searchParams.get('state');
    const filterDistrict = searchParams.get('district');
    const filterDateFrom = searchParams.get('dateFrom');
    const filterDateTo = searchParams.get('dateTo');
    const filterSearch = searchParams.get('search');
    
    const supabase = createServerClient();
    
    const sessionRole = session.user.role;
    const sessionState = session.user.state;
    const staffName = (session.user as any).staffName;

    // DEBUG: Log raw session data
    console.log(`[patients/route] DEBUG - Raw session.user:`, JSON.stringify({
      email: session.user.email,
      role: sessionRole,
      state: sessionState,
      staffName
    }));

    // Normalize role using the canonical Role constants (auth.ts already normalizes JWT)
    const role = normalizeRole(sessionRole) ?? Role.ME_OFFICER;

    // DEBUG: Log role detection
    console.log(`[patients/route] DEBUG - Role detection:`, {
      sessionRole,
      normalizedRole: role,
      RoleConstants: {
        ADMIN: Role.ADMIN,
        PM: Role.PROGRAM_MANAGER,
        SPM: Role.STATE_PROGRAM_MANAGER,
        ME: Role.ME_OFFICER,
        PC: Role.PRISON_COORDINATOR
      }
    });

    // Role-based record limits (hard caps per tier)
    // ADMIN/PM: 20,000 | SUPERVISOR (SPM/ME): 10,000 | FIELD: 2,000
    let tierLimit: number;

    const isAdmin = role === Role.ADMIN;
    const isPM    = role === Role.PROGRAM_MANAGER;
    const isSPM   = role === Role.STATE_PROGRAM_MANAGER;
    const isME    = role === Role.ME_OFFICER;
    const isPC    = role === Role.PRISON_COORDINATOR;
    
    // DEBUG: Log boolean checks
    console.log(`[patients/route] DEBUG - Role checks:`, { isAdmin, isPM, isSPM, isME, isPC });
    
    if (isAdmin || isPM) {
      tierLimit = 20000;
    } else if (isSPM || isME) {
      tierLimit = 10000;
    } else {
      tierLimit = 2000;
    }

    // Client can request LESS than tier limit, but never MORE
    const requestedPageSize = requestedPageSizeStr ? parseInt(requestedPageSizeStr, 10) : tierLimit;
    const maxRecords = Math.min(requestedPageSize, tierLimit);
    
    const batchSize = 1000; // Supabase hard limit per query
    const offset = (page - 1) * maxRecords;
    let batches = 0;

    console.log(`[patients/route] FINAL - User: ${session.user.email}, Role: ${role}, TierLimit: ${tierLimit}, Requested: ${requestedPageSize}, Max: ${maxRecords}`);

    // Build base query with ALL filters (RBAC + query params)
    const applyFilters = (query: any) => {
      // RBAC filters — use canonical Role constants
      if (isAdmin || isPM) {
        // National tier — no RBAC filters
      } else if (isSPM || isME) {
        if (sessionState && sessionState !== 'All') {
          query = query.eq('screening_state', sessionState);
        }
      } else if (isPC) {
        if (staffName) {
          query = query.ilike('staff_name', staffName.trim());
        }
      }
      
      // Query param filters (for filter bar)
      if (filterState && filterState !== 'all') {
        query = query.eq('screening_state', filterState);
      }
      if (filterDistrict && filterDistrict !== 'all') {
        query = query.eq('screening_district', filterDistrict);
      }
      if (filterDateFrom) {
        query = query.gte('screening_date', filterDateFrom);
      }
      if (filterDateTo) {
        query = query.lte('screening_date', filterDateTo);
      }
      if (filterSearch) {
        query = query.or(`inmate_name.ilike.%${filterSearch}%,unique_id.ilike.%${filterSearch}%`);
      }
      
      return query;
    };

    // Get filtered count
    let countQuery = supabase.from('patients').select('*', { count: 'exact', head: true });
    countQuery = applyFilters(countQuery);
    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('[patients/route] Count error:', countError);
      return NextResponse.json({ 
        error: 'Database error', 
        code: countError.code,
        message: countError.message 
      }, { status: 500 });
    }

    // Batch fetch with column selection
    const records: any[] = [];
    let from = offset;
    const limit = Math.min(maxRecords, (totalCount || 0) - offset);
    
    while (records.length < limit) {
      const batchLimit = Math.min(batchSize, limit - records.length);
      batches++;
      
      let batchQuery = supabase
        .from('patients')
        .select(SELECTED_COLUMNS, { count: 'exact' })
        .order('screening_date', { ascending: false })
        .range(from, from + batchLimit - 1);
      
      batchQuery = applyFilters(batchQuery);
      const { data, error } = await batchQuery;
      
      if (error) {
        console.error('[patients/route] Batch error:', error);
        return NextResponse.json({ 
          error: 'Database query failed',
          code: error.code,
          message: error.message
        }, { status: 500 });
      }
      
      if (!data || data.length === 0) break;
      records.push(...data);
      from += data.length;
      if (data.length < batchLimit) break; // No more rows
    }

    const durationMs = Date.now() - startTime;
    console.log(`[patients/route] ✅ Fetched ${records.length}/${totalCount} in ${batches} batches (${durationMs}ms)`);

    // Response envelope with meta
    const response: PatientsResponse = {
      data: records,
      meta: {
        total: totalCount || 0,
        returned: records.length,
        limit,
        role,
        batches,
        durationMs
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        'X-Total-Count': String(totalCount || 0),
        'X-Returned': String(records.length),
        'X-Batches': String(batches),
        'X-Duration-Ms': String(durationMs)
      }
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[patients/route] Exception:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
