import { auth } from '@/auth';
import { Role, ROLE_DATA_ACCESS, DataAccessTier, normalizeRole } from '@/lib/constants/roles';

export interface SessionScope {
  role: string;
  state: string | null;
  district: string | null;
  staffName: string | null;
}

export async function getSessionScope(): Promise<SessionScope> {
  const session = await auth();

  if (!session?.user) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }

  const rawRole = session.user.role ?? 'ME';
  const role = normalizeRole(rawRole) ?? Role.ME_OFFICER;
  const rawState = (session.user.state ?? 'All').trim();
  const rawDist = ((session.user as any).district ?? 'All').trim();
  const staffName = ((session.user as any).staffName ?? session.user.name) ?? null;

  const accessTier = ROLE_DATA_ACCESS[role];

  return {
    role,
    state: accessTier === DataAccessTier.NATIONAL || rawState === 'All' ? null : rawState,
    district:
      accessTier === DataAccessTier.NATIONAL ||
      accessTier === DataAccessTier.STATE ||
      rawDist === 'All'
        ? null
        : rawDist,
    staffName: accessTier === DataAccessTier.FACILITY ? staffName : null,
  };
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
