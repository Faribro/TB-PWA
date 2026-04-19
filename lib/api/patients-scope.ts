/**
 * Shared server-side utilities for patients API
 * Centralizes auth, RBAC, filtering, and query building
 */

import { auth } from '@/auth';
import { normalizeRole, Role } from '@/lib/constants/roles';
import type { Session } from 'next-auth';

export interface PatientScope {
  session: Session;
  role: string;
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
  const isNational = role === Role.ADMIN || role === Role.PROGRAM_MANAGER;

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
  
  // National access - no RBAC filter
  if (isNational) {
    return query;
  }
  
  // State-level access
  if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
    if (sessionState && sessionState !== 'All') {
      if (sessionState === 'Maharashtra') {
        (query as any) = (query as any).in('screening_state', ['Maharashtra', 'Mumbai']);
      } else {
        (query as any) = (query as any).eq('screening_state', sessionState);
      }
    }
  } 
  // Staff-level access
  else if (role === Role.PRISON_COORDINATOR) {
    if (staffName) {
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
    if (state === 'Maharashtra') {
      (query as any) = (query as any).in('screening_state', ['Maharashtra', 'Mumbai']);
    } else {
      (query as any) = (query as any).eq('screening_state', state);
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
 * Machine-readable, no PII
 */
export function logApiRequest(
  endpoint: string,
  scope: PatientScope,
  metadata: Record<string, any> = {}
) {
  const log = {
    endpoint,
    role: scope.role,
    scope: scope.sessionState || 'national',
    isNational: scope.isNational,
    ...metadata,
    timestamp: new Date().toISOString()
  };
  
  console.log(JSON.stringify(log));
}

/**
 * Structured logging for API responses
 * Machine-readable, includes timing
 */
export function logApiResponse(
  endpoint: string,
  durationMs: number,
  metadata: Record<string, any> = {}
) {
  const log = {
    endpoint,
    durationMs,
    ...metadata,
    timestamp: new Date().toISOString()
  };
  
  console.log(JSON.stringify(log));
}
