import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server-admin';
import { getSupabaseClient } from '@/lib/supabase-server';
import { Role } from '@/lib/constants/roles';
import { logAudit } from '@/lib/audit-log';
import { 
  validateAndExtractScope, 
  buildScopedQuery, 
  logApiRequest, 
  logApiResponse,
  validateDateFilter,
  validateCursor,
  type PatientFilters 
} from '@/lib/api/patients-scope';

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
    scope?: string; // Added for consistency
    durationMs: number;
    mode: 'cursor';
    total?: number; // Optional for backward compatibility
  };
}

/**
 * Encodes cursor for keyset pagination
 * Uses created_at + id for stable, deterministic ordering
 * created_at is NOT NULL (has default), ensuring no ordering issues
 */
function encodeCursor(created_at: string, id: string): string {
  const payload = `${created_at}::${id}`;
  return Buffer.from(payload).toString('base64url');
}

/**
 * Decodes cursor for keyset pagination
 * Gracefully handles invalid cursors by returning null
 */
function decodeCursor(cursor: string): [string, string] | null {
  try {
    return validateCursor(cursor);
  } catch (err) {
    console.warn('[patients/GET] Invalid cursor:', err instanceof Error ? err.message : 'Unknown');
    return null;
  }
}

// Validation helpers
const STATE_REGEX = /^[A-Za-z\s]+$/;
const DISTRICT_REGEX = /^[A-Za-z0-9\s]+$/;
const MAX_LIMIT = 10000;
const DEFAULT_LIMIT = 500;

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

/**
 * GET /api/patients - Cursor-based pagination with stable ordering
 * 
 * Ordering: created_at DESC, id DESC (deterministic, no NULLs)
 * Cursor: base64(created_at::id)
 * 
 * Backward compatible params:
 * - pageSize -> mapped to limit
 * - limit -> preferred param
 * - cursor -> for pagination
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Validate auth and extract RBAC scope
    const scope = await validateAndExtractScope();

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
    let filters: PatientFilters;
    
    try {
      filters = {
        state: validateState(searchParams.get('state') || undefined),
        district: validateDistrict(searchParams.get('district') || undefined),
        dateFrom: validateDateFilter(searchParams.get('dateFrom'), 'dateFrom'),
        dateTo: validateDateFilter(searchParams.get('dateTo'), 'dateTo'),
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
    
    // Column selection - minimize payload
    const fullDetails = searchParams.get('fullDetails') === 'true';
    const selectedColumns = fullDetails ? FULL_COLUMNS : LIST_COLUMNS;
    
    const supabase = createServerClient();

    // Structured logging
    logApiRequest('/api/patients', scope, {
      limit: requestedLimit,
      hasCursor: !!cursor,
      fullDetails,
      filters: Object.entries(filters)
        .filter(([_, v]) => v !== undefined)
        .map(([k]) => k)
    });

    /**
     * Build query with stable keyset pagination
     * Order by: created_at DESC, id DESC
     * - created_at has NOT NULL constraint (stable)
     * - id is unique (deterministic tie-breaker)
     * - No NULL ordering issues
     */
    const fetchLimit = requestedLimit + 1;
    let query = supabase
      .from('patients')
      .select(selectedColumns)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    // Apply RBAC + user filters via shared utility
    console.log('[patients/GET] Before buildScopedQuery:', {
      role: scope.role,
      sessionState: scope.sessionState,
      isNational: scope.isNational,
      filters
    });
    query = buildScopedQuery(query, scope, filters);
    console.log('[patients/GET] After buildScopedQuery - filters applied');

    // Apply cursor for keyset pagination
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (!decoded) {
        // Graceful degradation: invalid cursor returns first page
        logApiResponse('/api/patients', Date.now() - startTime, {
          status: 'warning',
          message: 'Invalid cursor ignored, returning first page'
        });
      } else {
        const [lastCreatedAt, lastId] = decoded;
        // Keyset: WHERE (created_at < last) OR (created_at = last AND id < lastId)
        query = query.or(`created_at.lt.${lastCreatedAt},and(created_at.eq.${lastCreatedAt},id.lt.${lastId})`);
      }
    }

    // Apply range AFTER all filters to bypass Supabase 1000-row default
    // PostgREST has a hard 1000-row limit that .limit() cannot override
    // Use .range() instead which bypasses this limit
    query = query.range(0, fetchLimit - 1);

    // Execute query
    const { data, error } = await query;

    if (error) {
      logApiResponse('/api/patients', Date.now() - startTime, {
        status: 'error',
        error: error.message,
        code: error.code
      });
      return NextResponse.json({ 
        error: 'Database query failed',
        message: error.message
      }, { status: 500 });
    }

    // Determine if there are more results
    const hasMore = data.length > requestedLimit;
    const records = hasMore ? data.slice(0, requestedLimit) : data;

    // Generate next cursor using stable created_at + id
    let nextCursor: string | null = null;
    if (hasMore && records.length > 0) {
      const lastRecord = records[records.length - 1] as any;
      nextCursor = encodeCursor(lastRecord.created_at, lastRecord.id);
    }

    const durationMs = Date.now() - startTime;
    
    // Structured logging
    logApiResponse('/api/patients', durationMs, {
      status: 'success',
      returned: records.length,
      hasMore,
      role: scope.role,
      scope: scope.sessionState || 'national'
    });

    const response: CursorPaginationResponse = {
      data: records,
      nextCursor,
      hasMore,
      meta: {
        returned: records.length,
        requestedLimit,
        role: scope.role,
        durationMs,
        mode: 'cursor',
        scope: scope.sessionState || 'national',
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
    
    // Handle auth errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    logApiResponse('/api/patients', durationMs, {
      status: 'exception',
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });
    
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
  const startTime = Date.now();
  
  try {
    // Validate auth and extract scope
    const scope = await validateAndExtractScope();

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
    const isAdmin = scope.isNational;
    
    if (!isAdmin && scope.sessionState && scope.sessionState !== 'All' && existingPatient.screening_state !== scope.sessionState) {
      logApiResponse('/api/patients', Date.now() - startTime, {
        status: 'forbidden',
        patientState: existingPatient.screening_state,
        userScope: scope.sessionState
      });
      return NextResponse.json({ 
        error: 'Access denied',
        message: `You can only update patients in ${scope.sessionState}` 
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
      changed_by: scope.session.user.email || 'unknown',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined
    }).catch(err => {
      logApiResponse('/api/patients', Date.now() - startTime, {
        status: 'audit_failed',
        error: err instanceof Error ? err.message : 'Unknown'
      });
    });

    logApiResponse('/api/patients', Date.now() - startTime, {
      status: 'updated',
      patientId: id
    });
    
    return NextResponse.json({ result }, { status: 200 });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    
    // Handle auth errors
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    logApiResponse('/api/patients', durationMs, {
      status: 'exception',
      error: err instanceof Error ? err.message : 'Unknown'
    });
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
