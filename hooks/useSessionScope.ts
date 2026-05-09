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
    console.log('[fetcher] Attempting to fetch session scope from:', url);
    const res = await fetch(url);
    
    // Check if response is HTML (redirect to login page)
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('[fetcher] Received HTML response - likely redirected to login');
      return null;
    }
    
    if (!res.ok) {
      console.error('[fetcher] HTTP error response:', {
        status: res.status,
        statusText: res.statusText,
        url: url
      });
      
      if (res.status === 401) {
        console.log('[fetcher] Unauthorized - returning null session scope');
        return null;
      }
      
      if (res.status === 500) {
        console.error('[fetcher] Server error - attempting to parse error response');
        try {
          const errorData = await res.json();
          console.error('[fetcher] Server error details:', errorData);
        } catch (parseError) {
          console.error('[fetcher] Could not parse error response');
        }
      }
      
      const error = new Error('Failed to fetch session scope');
      console.error('[fetcher] HTTP error:', res.status, res.statusText);
      throw error;
    }
    
    const data = await res.json();
    console.log('[fetcher] Successfully fetched session scope:', data);
    return data;
  } catch (error) {
    // Handle network errors or JSON parsing errors
    console.error('[fetcher] Network or parsing error:', error);
    console.error('[fetcher] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
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
