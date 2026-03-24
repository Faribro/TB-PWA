/**
 * session-scope.ts
 * Single source of truth for data isolation.
 * Every API route and server action imports from here.
 */
import { auth } from '@/auth';

export interface SessionScope {
  role: string;
  state: string | null;   // null means "All" — admin sees everything
  district: string | null;
}

/** Returns the scope for the current request. Throws 401 if unauthenticated. */
export async function getSessionScope(): Promise<SessionScope> {
  const session = await auth();
  if (!session?.user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const role     = session.user.role     ?? 'M&E';
  const rawState = (session.user.state    ?? 'All').trim();
  const rawDist  = ((session.user as any).district ?? 'All').trim();

  const isSuperuser = role === 'admin' || role === 'Program Manager' || role === 'PM';

  return {
    role,
    state:    (isSuperuser || rawState === 'All') ? null : rawState,
    district: (isSuperuser || rawDist  === 'All') ? null : rawDist,
  };
}

/**
 * Applies state/district filters to any Supabase query builder.
 * Usage:  applyScope(supabase.from('patients').select('*'), scope)
 */
export function applyScope<T>(query: T, scope: SessionScope): T {
  let q = query as any;
  if (scope.state)    q = q.ilike('screening_state',    scope.state);
  if (scope.district) q = q.ilike('screening_district', scope.district);
  return q as T;
}
