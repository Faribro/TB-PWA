/**
 * session-scope.ts
 * Single source of truth for data isolation.
 * Every API route and server action imports from here.
 */
import { auth } from '@/auth';
import { Role, ROLE_DATA_ACCESS, DataAccessTier, normalizeRole } from '@/lib/constants/roles';

export interface SessionScope {
  role: string;
  state: string | null;   // null means "All" — admin sees everything
  district: string | null;
  staffName: string | null; // For PC role - filters by staff name
}

/** Returns the scope for the current request. Throws 401 if unauthenticated. */
export async function getSessionScope(): Promise<SessionScope> {
  try {
    const session = await auth();
    if (!session?.user) {
      console.error('[getSessionScope] No session or user found');
      throw new Error('Unauthorized');
    }

    const rawRole = session.user.role ?? 'ME';
    const role = normalizeRole(rawRole) || Role.ME_OFFICER;
    const rawState = (session.user.state ?? 'All').trim();
    const rawDist = ((session.user as any).district ?? 'All').trim();
    const staffName = (session.user as any).staffName ?? session.user.name;

    // Determine data access tier
    const accessTier = ROLE_DATA_ACCESS[role];

    return {
      role,
      state: accessTier === DataAccessTier.NATIONAL || rawState === 'All' ? null : rawState,
      district: accessTier === DataAccessTier.NATIONAL || accessTier === DataAccessTier.STATE || rawDist === 'All' ? null : rawDist,
      staffName: accessTier === DataAccessTier.FACILITY ? staffName : null,
    };
  } catch (error) {
    console.error('[getSessionScope] Error:', error);
    throw error;
  }
}

/**
 * Applies state/district filters to any Supabase query builder.
 * Usage:  applyScope(supabase.from('patients').select('*'), scope)
 */
export function applyScope<T>(query: T, scope: SessionScope): T {
  let q = query as any;
  if (scope.state)    q = q.eq('screening_state',    scope.state);
  if (scope.district) q = q.eq('screening_district', scope.district);
  if (scope.staffName) q = q.ilike('staff_name', `%${scope.staffName}%`);
  return q as T;
}
