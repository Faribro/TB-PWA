import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server-admin';
import { getSupabaseClient } from '@/lib/supabase-server';
import { Role } from '@/lib/constants/roles';
import { logAudit } from '@/lib/audit-log';
import { getCachedWithMemory } from '@/lib/memory-cache';
import { invalidatePatientCaches } from '@/lib/cache-version';
import { 
  validateAndExtractScope, 
  buildScopedQuery, 
  logApiRequest, 
  logApiResponse,
  validateDateFilter,
  validateCursor,
  type PatientFilters 
} from '@/lib/api/patients-scope';
import { prisma } from '@/lib/prisma';

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
  'registration_date', 'closure_reason', 'updated_at',
  'other_facility_name', 'treatment_regimen'
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

function getPrismaStateConditions(state: string) {
  const normalized = state.toLowerCase().replace(/[_\s]+/g, '');
  switch (normalized) {
    case 'maharashtra':
    case 'mumbai':
      return {
        OR: [
          { screening_state: { contains: 'maharashtra', mode: 'insensitive' as const } },
          { screening_state: { contains: 'mumbai', mode: 'insensitive' as const } }
        ]
      };
    case 'madhyapradesh':
      return { screening_state: { equals: 'Madhya Pradesh' } };
    case 'uttarakhand':
    case 'uttaranchal':
      return { screening_state: { equals: 'Uttarakhand' } };
    case 'gujarat':
      return { screening_state: { equals: 'Gujarat' } };
    case 'chandigarh':
      return { screening_state: { equals: 'Chandigarh' } };
    default:
      return { screening_state: { contains: state, mode: 'insensitive' as const } };
  }
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
    
    // Validate cursor UUID string format if present
    if (cursor && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor)) {
      return NextResponse.json({
        error: 'Invalid parameters',
        message: 'Invalid cursor: must be a valid UUID'
      }, { status: 400 });
    }
    
    // Parse limit with validation (defaults to 50)
    let requestedLimit = 50;
    const rawLimit = limitParam || pageSizeParam;
    if (rawLimit) {
      const parsed = parseInt(rawLimit, 10);
      if (!isNaN(parsed) && parsed > 0) {
        requestedLimit = parsed;
      }
    }
    
    // Validate and cap limit - NEVER exceed 1000
    requestedLimit = Math.min(requestedLimit, 1000);
    
    // Validate and sanitize filters
    let filters: PatientFilters;
    
    try {
      filters = {
        state: validateState(searchParams.get('state') || undefined),
        district: validateDistrict(searchParams.get('district') || undefined),
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
    
    // Validate search length to prevent abuse
    if (filters.search && filters.search.length > 100) {
      return NextResponse.json({
        error: 'Invalid search',
        message: 'Search query too long (max 100 characters)'
      }, { status: 400 });
    }
    
    // Column selection - minimize payload
    const fullDetails = searchParams.get('fullDetails') === 'true';
    
    // Generate cache key based on all parameters
    const cacheKey = `patients:${scope.role}:${scope.sessionState || 'all'}:${cursor || 'first'}:${requestedLimit}:${JSON.stringify(filters)}:${fullDetails}`;
    
    // Try cache first (30s TTL)
    const cachedResponse = await getCachedWithMemory<CursorPaginationResponse>(
      cacheKey,
      async (): Promise<CursorPaginationResponse> => {
        // Structured logging
        logApiRequest('/api/patients', scope, {
          limit: requestedLimit,
          hasCursor: !!cursor,
          fullDetails,
          filters: Object.entries(filters)
            .filter(([_, v]) => v !== undefined)
            .map(([k]) => k)
        });

        // Build Prisma where clause
        const where: any = { AND: [] };

        // 1. Apply RBAC filters
        const { role, sessionState, staffName, isNational } = scope;
        if (!isNational) {
          if (role === 'State Program Manager' || role === 'State Officer' || role === 'ME' || role === 'State M&E' || role === 'ME Officer') {
            if (sessionState && sessionState !== 'All') {
              where.AND.push(getPrismaStateConditions(sessionState));
            }
          } else if (role === 'PC' || role === 'Prison Coordinator') {
            if (staffName) {
              where.AND.push({
                staff_name: {
                  equals: staffName.trim(),
                  mode: 'insensitive'
                }
              });
            }
          }
        }

        // 2. Apply user-provided filters
        if (filters.state && filters.state !== 'all') {
          where.AND.push(getPrismaStateConditions(filters.state));
        }
        
        if (filters.district && filters.district !== 'all') {
          where.AND.push({
            screening_district: {
              equals: filters.district
            }
          });
        }
        
        if (filters.dateFrom) {
          where.AND.push({
            screening_date: {
              gte: new Date(filters.dateFrom)
            }
          });
        }
        
        if (filters.dateTo) {
          where.AND.push({
            screening_date: {
              lte: new Date(filters.dateTo)
            }
          });
        }
        
        if (filters.search) {
          const searchLower = filters.search.trim();
          where.AND.push({
            OR: [
              { inmate_name: { contains: searchLower, mode: 'insensitive' } },
              { unique_id: { contains: searchLower, mode: 'insensitive' } }
            ]
          });
        }
        
        if (filters.facilityType && filters.facilityType !== 'all') {
          where.AND.push({
            facility_type: {
              equals: filters.facilityType
            }
          });
        }
        
        if (filters.suspected && filters.suspected !== 'all') {
          if (filters.suspected === 'Yes') {
            where.AND.push({
              OR: [
                { xray_result: { contains: 'abnormal', mode: 'insensitive' } },
                { xray_result: { contains: 'suspected', mode: 'insensitive' } },
                { chest_x_ray_result: { contains: 'abnormal', mode: 'insensitive' } },
                { chest_x_ray_result: { contains: 'suspected', mode: 'insensitive' } }
              ]
            });
          } else if (filters.suspected === 'No') {
            where.AND.push({
              OR: [
                { xray_result: { contains: 'normal', mode: 'insensitive' } },
                { chest_x_ray_result: { contains: 'normal', mode: 'insensitive' } }
              ]
            });
          } else {
            where.AND.push({
              xray_result: {
                equals: filters.suspected
              }
            });
          }
        }
        
        if (filters.tbDiagnosed && filters.tbDiagnosed !== 'all') {
          if (filters.tbDiagnosed.toLowerCase() === 'pending') {
            where.AND.push({
              tb_diagnosed: null
            });
          } else {
            where.AND.push({
              tb_diagnosed: {
                equals: filters.tbDiagnosed
              }
            });
          }
        }

        // Clean up empty AND array
        if (where.AND.length === 0) {
          delete where.AND;
        }

        // Fields selection configuration
        const selectedFields = fullDetails ? [
          'id', 'unique_id', 'inmate_name', 'screening_date', 'submitted_on',
          'screening_state', 'screening_district', 'facility_name', 'facility_type',
          'xray_result', 'tb_diagnosed', 'tb_type', 'att_start_date',
          'referral_date', 'hiv_status', 'sex', 'age', 'created_at',
          'chest_x_ray_result', 'symptoms_present',
          'referred_facility', 'kobo_uuid', 'ai_link_status', 'nikshay_abha_id',
          'date_of_birth', 'contact_number', 'address', 'father_husband_name',
          'inmate_type', 'staff_name', 'symptoms_10s', 'tb_past_history', 'remarks',
          'tb_diagnosis_date', 'att_completion_date', 'art_status', 'art_number',
          'registration_date', 'closure_reason', 'updated_at',
          'other_facility_name', 'treatment_regimen'
        ] : [
          'id', 'unique_id', 'inmate_name', 'screening_date', 'submitted_on',
          'screening_state', 'screening_district', 'facility_name', 'facility_type',
          'xray_result', 'tb_diagnosed', 'tb_type', 'att_start_date',
          'referral_date', 'hiv_status', 'sex', 'age', 'created_at',
          'chest_x_ray_result', 'symptoms_present'
        ];

        const selectBlock = selectedFields.reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {} as Record<string, boolean>);

        // Keyset Pagination configuration (take: limit + 1, order by: created_at DESC, id DESC)
        const fetchLimit = requestedLimit + 1;
        const prismaQuery: any = {
          take: fetchLimit,
          where,
          select: selectBlock,
          orderBy: [
            { created_at: 'desc' },
            { id: 'desc' }
          ]
        };

        if (cursor) {
          prismaQuery.cursor = { id: cursor };
          prismaQuery.skip = 1;
        }

        // Execute query using global Prisma client singleton
        const data = await prisma.patients.findMany(prismaQuery);

        // Determine if there are more results
        const hasMore = data.length === fetchLimit;
        const records = hasMore ? data.slice(0, requestedLimit) : data;

        // Generate next cursor (the unique record UUID string)
        let nextCursor: string | null = null;
        if (hasMore && records.length > 0) {
          nextCursor = records[records.length - 1].id;
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

        return {
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
          }
        };
      },
      30 // 30s TTL
    );

    return NextResponse.json(cachedResponse, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        'X-Returned': String(cachedResponse.data.length),
        'X-Has-More': String(cachedResponse.hasMore),
        'X-Duration-Ms': String(cachedResponse.meta.durationMs),
        'X-Cache': 'MULTI-LAYER'
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
    
    // CRITICAL: Invalidate all patient-related caches
    await invalidatePatientCaches();
    console.log('[patients/POST] ✅ Cache invalidated after patient update');
    
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
