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
  try {
    const res = await fetch(url);
    
    // Check if response is HTML (redirect to login page)
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('[fetcher] Received HTML response - likely redirected to login');
      return null;
    }
    
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
  } catch (error) {
    // Handle network errors or JSON parsing errors
    console.error('[fetcher] Network or parsing error:', error);
    return null;
  }
};

export function useSessionScope(): SessionScope | null {
  const { data, error } = useSWR<SessionScope>('/api/me', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5 * 60 * 1000, // Reduced from 1 hour to 5 minutes
    shouldRetryOnError: false,
    errorRetryCount: 0,
    errorRetryInterval: 0,
    onError: (err) => {
      // Suppress all errors to prevent ClientFetchError
      console.error('[useSessionScope] SWR error (suppressed):', err?.message || 'Unknown error');
    },
  });
  
  return data ?? null;
}
