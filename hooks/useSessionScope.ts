'use client';

import useSWR from 'swr';
import { Role } from '@/lib/constants/roles';

export interface SessionScope {
  role: string;
  state: string | null;
  district: string | null;
  staffName: string | null;
}

// Roles that have national-level (unrestricted) data access
export const SUPERUSER_ROLES = [Role.ADMIN, Role.PROGRAM_MANAGER] as const;

export function isSuperuser(scope: SessionScope | null): boolean {
  if (!scope) return false;
  return (SUPERUSER_ROLES as readonly string[]).includes(scope.role);
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) {
      return null;
    }
    const error = new Error('Failed to fetch session scope');
    console.error('[fetcher] HTTP error:', res.status, res.statusText);
    throw error;
  }
  const data = await res.json();
  return data;
};

export function useSessionScope(): SessionScope | null {
  const { data, error } = useSWR<SessionScope>('/api/me', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5 * 60 * 1000, // Reduced from 1 hour to 5 minutes
    shouldRetryOnError: false,
    onError: (err) => {
      if (err?.message !== 'Failed to fetch session scope') {
        console.error('[useSessionScope] SWR error:', err);
      }
    },
  });
  
  return data ?? null;
}
