import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';
import { getSupabaseClient } from '@/lib/supabase-server';
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
  'ai_link_status', 'nikshay_abha_id',
  // Additional columns for PatientDetailDrawer
  'date_of_birth', 'contact_number', 'address',
  'father_husband_name', 'inmate_type', 'staff_name',
  'symptoms_10s', 'tb_past_history', 'remarks'
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
    const requestedPageSize = Math.max(1, parseInt(searchParams.get('pageSize') ?? '5000', 10)); // Reduced from 100000 to 5000
    
    // Cap at 10000 to prevent timeouts
    const cappedPageSize = Math.min(requestedPageSize, 10000);
    
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

    // NO RECORD LIMITS - use cappedPageSize to prevent timeouts
    const maxRecords = cappedPageSize;
    
    const batchSize = 1000; // Supabase hard limit per query
    const offset = (page - 1) * maxRecords;
    let batches = 0;

    console.log(`[patients/route] FINAL - User: ${session.user.email}, Role: ${role}, Max: ${maxRecords} (no limits)`);

    // Build base query with ALL filters (RBAC + query params)
    const applyFilters = (query: any) => {
      // RBAC filters — use canonical Role constants
      if (role === Role.ADMIN || role === Role.PROGRAM_MANAGER) {
        // National tier — no RBAC filters
      } else if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
        if (sessionState && sessionState !== 'All') {
          query = query.eq('screening_state', sessionState);
        }
      } else if (role === Role.PRISON_COORDINATOR) {
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

    // Batch fetch with column selection using Promise.all for true parallelism
    const records: any[] = [];
    const limit = Math.min(maxRecords, (totalCount || 0) - offset);
    const numBatches = Math.ceil(limit / batchSize);
    
    if (limit > 0) {
      const batchPromises = Array.from({ length: numBatches }).map((_, i) => {
        const batchFrom = offset + (i * batchSize);
        const batchLimit = Math.min(batchSize, limit - (i * batchSize));
        const batchTo = batchFrom + batchLimit - 1;
        
        let batchQuery = supabase
          .from('patients')
          .select(SELECTED_COLUMNS)
          .order('screening_date', { ascending: false })
          .range(batchFrom, batchTo);
          
        return applyFilters(batchQuery);
      });

      const results = await Promise.all(batchPromises);
      batches = numBatches;

      for (const result of results) {
        if (result.error) {
          console.error('[patients/route] Batch error:', result.error);
          return NextResponse.json({ 
            error: 'Database query failed',
            code: result.error.code,
            message: result.error.message
          }, { status: 500 });
        }
        if (result.data) {
          records.push(...result.data);
        }
      }
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

// POST - Upsert patient data (bypasses RLS with service role)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    // Use service role client to bypass RLS
    const supabase = getSupabaseClient();
    
    const { data: result, error } = await supabase
      .from('patients')
      .upsert({ id, ...data }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[patients/POST] Upsert error:', error);
      return NextResponse.json({ 
        error: error.message,
        code: error.code 
      }, { status: 400 });
    }

    console.log(`[patients/POST] ✅ Upserted patient ${id} by ${session.user.email}`);
    
    return NextResponse.json({ result }, { status: 200 });
  } catch (err) {
    console.error('[patients/POST] Exception:', err);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
