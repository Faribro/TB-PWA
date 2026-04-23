import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import type { SessionScope } from '@/hooks/useSessionScope';

interface UseSWRAllPatientsOptions {
  limit?: number;
  progressive?: boolean; // Enable progressive loading (default: false)
  maxPages?: number; // Safety cap on pages (default: 50)
  maxRecords?: number; // Safety cap on total records (default: 500k)
  timeout?: number; // Timeout in ms (default: 120s)
  autoFetchAll?: boolean; // Alias for progressive - explicit opt-in for full dataset
  filters?: {
    state?: string;
    district?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  };
}

interface CursorPaginationResponse {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
  meta: {
    returned: number;
    requestedLimit: number;
    role: string;
    durationMs: number;
    mode: 'cursor' | 'offset';
  };
}

interface ProgressiveLoadState {
  loadedCount: number;
  totalCount: number;
  isLoadingMore: boolean;
  progress: number; // 0-100
}

const cursorFetcher = async (
  scope: SessionScope | null,
  limit: number,
  filters?: UseSWRAllPatientsOptions['filters'],
  cursor?: string | null,
  fullDetails?: boolean
): Promise<CursorPaginationResponse> => {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  
  if (cursor) {
    params.set('cursor', cursor);
  }
  
  if (fullDetails) {
    params.set('fullDetails', 'true');
  }
  
  if (filters?.state) params.set('state', filters.state);
  if (filters?.district) params.set('district', filters.district);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.search) params.set('search', filters.search);
  
  const url = `/api/patients?${params.toString()}`;

  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[useSWRPatients] API error:', response.status, errorText);
    throw new Error(`API error: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.error) {
    throw new Error(result.message || result.error);
  }
  
  return result;
};

export function useSWRAllPatients(
  scope: SessionScope | null,
  options: UseSWRAllPatientsOptions = {}
) {
  const { data: session } = useSession();
  
  const limit = useMemo(() => {
    return options.limit ?? 500;
  }, [options.limit]);
  
  const progressive = options.progressive ?? options.autoFetchAll ?? false;
  const maxPages = options.maxPages ?? 50;
  const maxRecords = options.maxRecords ?? 500000;
  const timeout = options.timeout ?? 120000;
  const { filters } = options;
  
  // Progressive loading state
  const [progressState, setProgressState] = useState<ProgressiveLoadState>({
    loadedCount: 0,
    totalCount: 0,
    isLoadingMore: false,
    progress: 0
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const backgroundLoadingRef = useRef(false);
  const currentSessionIdRef = useRef<string | null>(null);
  
  const key = session && scope
    ? ['/api/patients', scope.state ?? 'all', scope.district ?? 'all', limit, JSON.stringify(filters)]
    : null;
  
  // Stable key for effect - only changes on filter/scope change, NOT on data updates
  const stableEffectKey = useMemo(() => key ? JSON.stringify(key) : null, [key ? JSON.stringify(key) : null]);
  
  const { data, error, isLoading, mutate } = useSWR(
    key,
    async () => {
      // Use bulk endpoint for faster loading
      const params = new URLSearchParams();
      if (filters?.state) params.set('state', filters.state);
      if (filters?.district) params.set('district', filters.district);
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
      
      const url = `/api/patients/bulk?${params.toString()}`;
      console.log('[useSWRPatients] Fetching bulk:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Bulk API error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[useSWRPatients] Bulk response:', {
        total: result.data.length,
        cached: result.meta.cached,
        durationMs: result.meta.durationMs
      });
      
      // Return in expected format
      return {
        data: result.data,
        nextCursor: null,
        hasMore: false,
        meta: {
          returned: result.data.length,
          requestedLimit: result.data.length,
          role: result.meta.role,
          durationMs: result.meta.durationMs,
          mode: 'bulk' as const,
          pages: 1,
          progressive: false
        }
      };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      dedupingInterval: 30000,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      keepPreviousData: false,
      onError: (err) => {
        console.error('[useSWRPatients] Error:', err);
      }
    }
  );
  
  // No progressive loading needed with bulk endpoint
  const [progressState] = useState<ProgressiveLoadState>({
    loadedCount: 0,
    totalCount: 0,
    isLoadingMore: false,
    progress: 100
  });

  const setTotalCount = useCallback((total: number) => {
    // No-op with bulk endpoint
  }, []);

  const currentLoadedCount = data?.data?.length ?? 0;
  const displayProgress = 100;

  return {
    patients: data?.data ?? [],
    meta: data?.meta ?? null,
    total: data?.data?.length ?? 0,
    hasMore: false,
    nextCursor: null,
    isLoading,
    isLoadingMore: false,
    loadedCount: currentLoadedCount,
    totalCount: currentLoadedCount,
    progress: displayProgress,
    isPartialLoad: false,
    cappedReason: null as string | null,
    error,
    mutate,
    setTotalCount
  };
}

export function useSWRPatientsExport(
  scope: SessionScope | null,
  filters?: UseSWRAllPatientsOptions['filters']
) {
  const { data: session } = useSession();
  
  const key = session && scope
    ? ['/api/patients/export', scope.state ?? 'all', JSON.stringify(filters)]
    : null;
  
  const exportFetcher = async () => {
    const params = new URLSearchParams();
    
    if (filters?.state) params.set('state', filters.state);
    if (filters?.district) params.set('district', filters.district);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    
    const url = `/api/patients/export?${params.toString()}`;
    console.log('[useSWRPatientsExport] Fetching:', url);

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    const result = await response.json();
    return result;
  };
  
  const { data, error, isLoading, mutate } = useSWR(
    key,
    exportFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
      errorRetryCount: 2,
      keepPreviousData: false
    }
  );

  return {
    patients: data?.data ?? [],
    meta: data?.meta ?? null,
    isLoading,
    error,
    mutate
  };
}
