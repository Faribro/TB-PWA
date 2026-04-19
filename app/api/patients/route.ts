import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';
import { getSupabaseClient } from '@/lib/supabase-server';
import { normalizeRole, Role } from '@/lib/constants/roles';
import { logAudit } from '@/lib/audit-log';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const LIST_COLUMNS = [
  'id', 'unique_id', 'inmate_name', 'screening_date', 'submitted_on',
  'screening_state', 'screening_district', 'facility_name', 'facility_type',
  'xray_result', 'tb_diagnosed', 'tb_type', 'att_start_date',
  'referral_date', 'hiv_status', 'sex', 'age', 'created_at'
].join(',');

const FULL_COLUMNS = [
  ...LIST_COLUMNS.split(','),
  'referred_facility', 'kobo_uuid', 'ai_link_status', 'nikshay_abha_id',
  'date_of_birth', 'contact_number', 'address', 'father_husband_name',
  'inmate_type', 'staff_name', 'symptoms_10s', 'tb_past_history', 'remarks',
  'tb_diagnosis_date', 'att_completion_date', 'art_status', 'art_number',
  'registration_date', 'closure_reason', 'updated_at'
].join(',');

interface CursorPaginationResponse {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
  meta: {
    returned: number;
    requestedLimit: number;
    role: string;
    durationMs: number;
    mode: 'cursor';
    total?: number; // Optional for backward compatibility
  };
}

function encodeCursor(screening_date: string | null, id: string): string {
  const payload = `${screening_date || 'null'}::${id}`;
  return Buffer.from(payload).toString('base64url');
}

function decodeCursor(cursor: string): [string | null, string] {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
    const [date, id] = decoded.split('::');
    return [date === 'null' ? null : date, id];
  } catch {
    throw new Error('Invalid cursor');
  }
}

// Validation helpers
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
const STATE_REGEX = /^[A-Za-z\s]+$/; // Alphabetic with spaces
const DISTRICT_REGEX = /^[A-Za-z0-9\s]+$/; // Alphanumeric with spaces
const MAX_LIMIT = 10000;
const DEFAULT_LIMIT = 500;

function validateDate(dateStr: string | undefined, fieldName: string): string | undefined {
  if (!dateStr) return undefined;
  if (!DATE_REGEX.test(dateStr)) {
    throw new Error(`Invalid ${fieldName}: must be YYYY-MM-DD format`);
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: not a valid date`);
  }
  // Sanity check: date not too far in future or past
  const now = new Date();
  const maxPast = new Date('2000-01-01');
  if (date > new Date(now.getFullYear() + 1, 11, 31)) {
    throw new Error(`Invalid ${fieldName}: date too far in future`);
  }
  if (date < maxPast) {
    throw new Error(`Invalid ${fieldName}: date before year 2000`);
  }
  return dateStr;
}

function validateState(state: string | undefined): string | undefined {
  if (!state || state === 'all') return undefined;
  if (!STATE_REGEX.test(state)) {
    throw new Error('Invalid state: contains invalid characters');
  }
  if (state.length > 50) {
    throw new Error('Invalid state: too long');
  }
  return state;
}

function validateDistrict(district: string | undefined): string | undefined {
  if (!district || district === 'all') return undefined;
  if (!DISTRICT_REGEX.test(district)) {
    throw new Error('Invalid district: contains invalid characters');
  }
  if (district.length > 100) {
    throw new Error('Invalid district: too long');
  }
  return district;
}

function applyRBACFilters(query: any, role: string, sessionState: string | undefined, staffName: string | undefined) {
  if (role === Role.ADMIN || role === Role.PROGRAM_MANAGER) {
    return query;
  }
  
  if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
    if (sessionState && sessionState !== 'All') {
      if (sessionState === 'Maharashtra') {
        query = query.in('screening_state', ['Maharashtra', 'Mumbai']);
      } else {
        query = query.eq('screening_state', sessionState);
      }
    }
  } else if (role === Role.PRISON_COORDINATOR) {
    if (staffName) {
      query = query.ilike('staff_name', staffName.trim());
    }
  }
  
  return query;
}

function applyUserFilters(
  query: any,
  filters: {
    state?: string;
    district?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }
) {
  if (filters.state && filters.state !== 'all') {
    if (filters.state === 'Maharashtra') {
      query = query.in('screening_state', ['Maharashtra', 'Mumbai']);
    } else {
      query = query.eq('screening_state', filters.state);
    }
  }
  
  if (filters.district && filters.district !== 'all') {
    query = query.eq('screening_district', filters.district);
  }
  
  if (filters.dateFrom) {
    query = query.gte('screening_date', filters.dateFrom);
  }
  
  if (filters.dateTo) {
    query = query.lte('screening_date', filters.dateTo);
  }
  
  if (filters.search) {
    query = query.or(`inmate_name.ilike.%${filters.search}%,unique_id.ilike.%${filters.search}%`);
  }
  
  return query;
}

/**
 * GET /api/patients - Cursor-based pagination
 * 
 * Backward compatible params:
 * - pageSize -> mapped to limit (for old consumers)
 * - limit -> preferred param
 * - cursor -> for pagination
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
    
    // Backward compatibility: accept both pageSize and limit
    const pageSizeParam = searchParams.get('pageSize');
    const limitParam = searchParams.get('limit');
    const cursor = searchParams.get('cursor');
    
    // Parse limit with validation
    let requestedLimit = 500; // Default
    if (limitParam) {
      requestedLimit = parseInt(limitParam, 10);
    } else if (pageSizeParam) {
      // Backward compatibility: map pageSize to limit
      const parsed = parseInt(pageSizeParam, 10);
      // Cap extremely large pageSize requests (e.g., 100000 from vertex)
      requestedLimit = parsed > 10000 ? 10000 : parsed;
    }
    
    // Validate and cap limit
    if (isNaN(requestedLimit) || requestedLimit < 1) {
      requestedLimit = 500;
    }
    requestedLimit = Math.min(requestedLimit, 10000); // Hard cap at 10k
    
    // Validate and sanitize filters
    let filters: {
      state?: string;
      district?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    };
    
    try {
      filters = {
        state: validateState(searchParams.get('state') || undefined),
        district: validateDistrict(searchParams.get('district') || undefined),
        dateFrom: validateDate(searchParams.get('dateFrom') || undefined, 'dateFrom'),
        dateTo: validateDate(searchParams.get('dateTo') || undefined, 'dateTo'),
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
    
    // Validate search length to prevent abuse
    if (filters.search && filters.search.length > 100) {
      return NextResponse.json({
        error: 'Invalid search',
        message: 'Search query too long (max 100 characters)'
      }, { status: 400 });
    }
    
    // Column selection
    const fullDetails = searchParams.get('fullDetails') === 'true';
    const selectedColumns = fullDetails ? FULL_COLUMNS : LIST_COLUMNS;
    
    const supabase = createServerClient();
    const sessionState = session.user.state;
    const staffName = (session.user as any).staffName;
    const role = normalizeRole(session.user.role) ?? Role.ME_OFFICER;

    console.log(`[patients/GET] User: ${session.user.email}, Role: ${role}, Limit: ${requestedLimit}, Cursor: ${cursor ? 'present' : 'none'}`);

    // Build query with keyset pagination
    // NOTE: Fetch requestedLimit + 1 to check hasMore, bypassing Supabase 1000-row default
    const fetchLimit = requestedLimit + 1;
    let query = supabase
      .from('patients')
      .select(selectedColumns, { count: 'exact' })
      .order('screening_date', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false });

    // Apply RBAC filters (server-side, based on session)
    query = applyRBACFilters(query, role, sessionState, staffName);
    
    // Apply user filters (on top of RBAC)
    query = applyUserFilters(query, filters);

    // Apply cursor if present
    if (cursor) {
      try {
        const [lastDate, lastId] = decodeCursor(cursor);
        
        if (lastDate) {
          query = query.or(`screening_date.lt.${lastDate},and(screening_date.eq.${lastDate},id.lt.${lastId})`);
        } else {
          query = query.is('screening_date', null).lt('id', lastId);
        }
      } catch (err) {
        return NextResponse.json({ 
          error: 'Invalid cursor',
          message: err instanceof Error ? err.message : 'Cursor decode failed'
        }, { status: 400 });
      }
    }

    // Apply limit AFTER all filters to bypass Supabase 1000-row default
    query = query.limit(fetchLimit);

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error('[patients/GET] Query error:', error);
      return NextResponse.json({ 
        error: 'Database query failed',
        message: error.message
      }, { status: 500 });
    }

    // Determine if there are more results
    const hasMore = data.length > requestedLimit;
    const records = hasMore ? data.slice(0, requestedLimit) : data;

    // Generate next cursor
    let nextCursor: string | null = null;
    if (hasMore && records.length > 0) {
      const lastRecord = records[records.length - 1] as any;
      nextCursor = encodeCursor(lastRecord.screening_date ?? null, lastRecord.id);
    }

    const durationMs = Date.now() - startTime;
    console.log(`[patients/GET] ✅ Returned ${records.length} records in ${durationMs}ms, hasMore: ${hasMore}`);

    const response: CursorPaginationResponse = {
      data: records,
      nextCursor,
      hasMore,
      meta: {
        returned: records.length,
        requestedLimit,
        role,
        durationMs,
        mode: 'cursor',
        // Backward compatibility: include total for first page only
        ...((!cursor && records.length > 0) ? { total: records.length } : {})
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        'X-Returned': String(records.length),
        'X-Has-More': String(hasMore),
        'X-Duration-Ms': String(durationMs)
      }
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[patients/GET] Exception:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

/**
 * POST /api/patients - Upsert patient data
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    // Sanitize data
    const sanitizedData = Object.entries(data).reduce((acc, [key, value]) => {
      acc[key] = (value === '' || value === undefined) ? null : value;
      return acc;
    }, {} as Record<string, any>);

    const supabase = getSupabaseClient();
    
    // Verify patient exists and user has access
    const { data: existingPatient, error: fetchError } = await supabase
      .from('patients')
      .select('id, screening_state')
      .eq('id', id)
      .single();

    if (fetchError || !existingPatient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Check state-scoped access
    const userRole = session.user.role;
    const userState = session.user.state;
    const isAdmin = userRole === Role.ADMIN || userRole === Role.PROGRAM_MANAGER;
    
    if (!isAdmin && userState && userState !== 'All' && existingPatient.screening_state !== userState) {
      console.warn(`[patients/POST] Access denied: ${session.user.email} tried to update patient in ${existingPatient.screening_state}`);
      return NextResponse.json({ 
        error: 'Access denied',
        message: `You can only update patients in ${userState}` 
      }, { status: 403 });
    }
    
    const oldData = existingPatient;
    
    const { data: result, error } = await supabase
      .from('patients')
      .upsert({ 
        id, 
        ...sanitizedData,
        updated_at: new Date().toISOString(),
        synced_to_sheets: false,
        sheets_sync_attempts: 0
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[patients/POST] Upsert error:', error);
      return NextResponse.json({ 
        error: error.message,
        code: error.code 
      }, { status: 400 });
    }

    // Audit log (fire-and-forget)
    logAudit({
      table_name: 'patients',
      record_id: id,
      action: 'UPDATE',
      old_data: oldData,
      new_data: result,
      changed_by: session.user.email || 'unknown',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined
    }).catch(err => console.error('[patients/POST] Audit log failed:', err));

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
