'use client';

import useSWR from 'swr';

export interface SessionScope {
  role: string;
  state: string | null;
  district: string | null;
  staffName: string | null;
}

export const SUPERUSER_ROLES = ['PM', 'admin', 'Program Manager'] as const;

export function isSuperuser(scope: SessionScope | null): boolean {
  if (!scope) return false;
  return (SUPERUSER_ROLES as readonly string[]).includes(scope.role);
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useSessionScope(): SessionScope | null {
  const { data } = useSWR<SessionScope>('/api/me', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60 * 60 * 1000,
  });
  return data ?? null;
}
