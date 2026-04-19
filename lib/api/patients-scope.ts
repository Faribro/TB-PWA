/**
 * Shared server-side utilities for patients API
 * Centralizes auth, RBAC, filtering, and query building
 */

import { auth } from '@/auth';
import { normalizeRole, Role } from '@/lib/constants/roles';
import type { Session } from 'next-auth';

export interface PatientScope {
  session: Session;
  role: string; // Keep as string for flexibility (normalizeRole returns string)
  sessionState: string | undefined;
  staffName: string | undefined;
  isNational: boolean;
}

export interface PatientFilters {
  state?: string;
  district?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Date validation regex and helpers
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PAST_DATE = new Date('2000-01-01');

/**
 * Validates and normalizes a date string
 * @returns normalized date or undefined if invalid
 */
export function validateDateFilter(dateStr: string | null | undefined, fieldName: string): string | undefined {
  if (!dateStr) return undefined;
  
  if (!DATE_REGEX.test(dateStr)) {
    throw new Error(`Invalid ${fieldName}: must be YYYY-MM-DD format`);
  }
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: not a valid date`);
  }
  
  const now = new Date();
  const maxFuture = new Date(now.getFullYear() + 1, 11, 31);
  
  if (date > maxFuture) {
    throw new Error(`Invalid ${fieldName}: date too far in future`);
  }
  if (date < MAX_PAST_DATE) {
    throw new Error(`Invalid ${fieldName}: date before year 2000`);
  }
  
  return dateStr;
}

/**
 * Validates cursor format and extracts components
 * @returns [created_at, id] tuple
 * @throws Error if cursor is invalid
 */
export function validateCursor(cursor: string): [string, string] {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
    const [created_at, id] = decoded.split('::');
    
    if (!created_at || !id) {
      throw new Error('Invalid cursor format: missing components');
    }
    
    // Validate created_at is ISO timestamp
    const timestamp = new Date(created_at);
    if (isNaN(timestamp.getTime())) {
      throw new Error('Invalid cursor: created_at is not a valid timestamp');
    }
    
    // Validate id is UUID format (basic check)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error('Invalid cursor: id is not a valid UUID');
    }
    
    return [created_at, id];
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Invalid cursor')) {
      throw err;
    }
    throw new Error('Invalid cursor: decode failed');
  }
}

/**
 * Normalizes Maharashtra state filter
 * Handles both 'Maharashtra' and 'Mumbai' as equivalent
 */
function normalizeMaharashtraFilter(state: string): string[] {
  return state === 'Maharashtra' ? ['Maharashtra', 'Mumbai'] : [state];
}

export interface ScopedQueryResult {
  scope: PatientScope;
  filters: PatientFilters;
}

/**
 * Validates session and extracts RBAC scope
 * @throws {Error} if not authenticated
 */
export async function validateAndExtractScope(): Promise<PatientScope> {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const role = normalizeRole(session.user.role) ?? Role.ME_OFFICER;
  const sessionState = session.user.state;
  const staffName = (session.user as any).staffName;
  
  // CRITICAL FIX: Admin and PM should ALWAYS have national access regardless of state field
  const isNational = role === Role.ADMIN || role === Role.PROGRAM_MANAGER;
  
  console.log('[validateAndExtractScope] Debug:', {
    rawRole: session.user.role,
    normalizedRole: role,
    sessionState,
    isNational,
    roleAdminConstant: Role.ADMIN,
    rolePMConstant: Role.PROGRAM_MANAGER,
    exactMatch: role === Role.ADMIN
  });

  return {
    session,
    role,
    sessionState,
    staffName,
    isNational
  };
}

/**
 * Applies RBAC filters to a Supabase query
 * Modifies query in-place and returns it for chaining
 */
export function applyRBACFilters<T>(
  query: T,
  scope: PatientScope
): T {
  const { role, sessionState, staffName, isNational } = scope;
  
  // Debug logging
  console.log('[RBAC Debug]', {
    role,
    sessionState,
    isNational,
    roleAdmin: Role.ADMIN,
    rolePM: Role.PROGRAM_MANAGER,
    comparison: {
      isAdmin: role === Role.ADMIN,
      isPM: role === Role.PROGRAM_MANAGER
    }
  });
  
  // National access - no RBAC filter
  if (isNational) {
    console.log('[RBAC] National access - NO filters applied');
    return query;
  }
  
  console.log('[RBAC] State/Staff access - applying filters');
  
  // State-level access
  if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
    if (sessionState && sessionState !== 'All') {
      const states = normalizeMaharashtraFilter(sessionState);
      console.log('[RBAC] Applying state filter:', states);
      if (states.length > 1) {
        (query as any) = (query as any).in('screening_state', states);
      } else {
        (query as any) = (query as any).eq('screening_state', states[0]);
      }
    }
  } 
  // Staff-level access
  else if (role === Role.PRISON_COORDINATOR) {
    if (staffName) {
      console.log('[RBAC] Applying staff filter:', staffName);
      (query as any) = (query as any).ilike('staff_name', staffName.trim());
    }
  }
  
  return query;
}

/**
 * Applies user-provided filters to a Supabase query
 * Modifies query in-place and returns it for chaining
 */
export function applyUserFilters<T>(
  query: T,
  filters: PatientFilters
): T {
  const { state, district, dateFrom, dateTo, search } = filters;
  
  if (state && state !== 'all') {
    const states = normalizeMaharashtraFilter(state);
    if (states.length > 1) {
      (query as any) = (query as any).in('screening_state', states);
    } else {
      (query as any) = (query as any).eq('screening_state', states[0]);
    }
  }
  
  if (district && district !== 'all') {
    (query as any) = (query as any).eq('screening_district', district);
  }
  
  if (dateFrom) {
    (query as any) = (query as any).gte('screening_date', dateFrom);
  }
  
  if (dateTo) {
    (query as any) = (query as any).lte('screening_date', dateTo);
  }
  
  if (search) {
    (query as any) = (query as any).or(`inmate_name.ilike.%${search}%,unique_id.ilike.%${search}%`);
  }
  
  return query;
}

/**
 * Builds a scoped query with RBAC + user filters applied
 * Returns the query ready for execution
 */
export function buildScopedQuery<T>(
  baseQuery: T,
  scope: PatientScope,
  filters: PatientFilters
): T {
  let query = applyRBACFilters(baseQuery, scope);
  query = applyUserFilters(query, filters);
  return query;
}

/**
 * Structured logging for API requests
 * Machine-readable, no PII, consistent format
 */
export function logApiRequest(
  endpoint: string,
  scope: PatientScope,
  metadata: Record<string, any> = {}
) {
  const log = {
    type: 'request',
    endpoint,
    role: scope.role,
    scope: scope.sessionState || 'national',
    isNational: scope.isNational,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  console.log(JSON.stringify(log));
}

/**
 * Structured logging for API responses
 * Machine-readable, includes timing, consistent format
 */
export function logApiResponse(
  endpoint: string,
  durationMs: number,
  metadata: Record<string, any> = {}
) {
  const log = {
    type: 'response',
    endpoint,
    durationMs,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  console.log(JSON.stringify(log));
}

/**
 * Gets first day of current month in YYYY-MM-DD format
 * Used for "this month" filters in summary queries
 */
export function getFirstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}
