import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useMemo, useCallback } from 'react';
import type { SessionScope } from '@/hooks/useSessionScope';

interface UseSWRAllPatientsOptions {
  limit?: number;
  autoFetchAll?: boolean; // NEW: Enable auto-pagination to fetch all pages
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

const cursorFetcher = async (
  scope: SessionScope | null,
  limit: number,
  filters?: UseSWRAllPatientsOptions['filters'],
  cursor?: string | null
): Promise<CursorPaginationResponse> => {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  
  if (cursor) {
    params.set('cursor', cursor);
  }
  
  if (filters?.state) params.set('state', filters.state);
  if (filters?.district) params.set('district', filters.district);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.search) params.set('search', filters.search);
  
  const url = `/api/patients?${params.toString()}`;
  console.log('[useSWRPatients] Fetching:', url);

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
  
  console.log('[useSWRPatients] Response:', {
    returned: result.data?.length,
    hasMore: result.hasMore,
    duration: result.meta?.durationMs
  });
  
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
  
  const autoFetchAll = options.autoFetchAll ?? true; // Default to true for Vertex
  const { filters } = options;
  
  const key = session && scope
    ? ['/api/patients', scope.state ?? 'all', scope.district ?? 'all', limit, JSON.stringify(filters), autoFetchAll]
    : null;
  
  const { data, error, isLoading, mutate } = useSWR(
    key,
    async () => {
      if (!autoFetchAll) {
        // Single page mode (for normal browsing)
        return await cursorFetcher(scope, limit, filters, null);
      }
      
      // Auto-pagination mode (for Vertex/complete dataset)
      const allRecords: any[] = [];
      let cursor: string | null = null;
      let hasMore = true;
      let iterations = 0;
      const maxIterations = 100; // Safety: 100 pages * 10k = 1M records max
      const startTime = Date.now();
      
      console.log('[useSWRPatients] Auto-pagination enabled, fetching all pages...');
      
      while (hasMore && iterations < maxIterations) {
        const page = await cursorFetcher(scope, limit, filters, cursor);
        allRecords.push(...page.data);
        cursor = page.nextCursor;
        hasMore = page.hasMore;
        iterations++;
        
        console.log(`[useSWRPatients] Page ${iterations}: +${page.data.length} records, total: ${allRecords.length}, hasMore: ${hasMore}`);
        
        if (!hasMore) break;
      }
      
      const durationMs = Date.now() - startTime;
      console.log(`[useSWRPatients] ✅ Complete: ${allRecords.length} records in ${iterations} pages (${durationMs}ms)`);
      
      return {
        data: allRecords,
        nextCursor: null,
        hasMore: false,
        meta: {
          returned: allRecords.length,
          requestedLimit: limit,
          role: scope?.role || 'unknown',
          durationMs,
          mode: 'cursor' as const,
          pages: iterations,
          autoFetchAll: true
        }
      };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      keepPreviousData: true,
      onError: (err) => {
        console.error('[useSWRPatients] Error:', err);
      }
    }
  );

  const loadMore = useCallback(async () => {
    if (autoFetchAll) {
      console.warn('[useSWRPatients] loadMore() called but autoFetchAll already fetched all records');
      return;
    }
    
    if (!data?.nextCursor || !data?.hasMore) {
      return;
    }
    
    const nextPage = await cursorFetcher(scope, limit, filters, data.nextCursor);
    
    mutate({
      ...nextPage,
      data: [...data.data, ...nextPage.data]
    }, false);
  }, [autoFetchAll, data, scope, limit, filters, mutate]);

  return {
    patients: data?.data ?? [],
    meta: data?.meta ?? null,
    total: data?.data?.length ?? 0, // Actual total from all fetched pages
    hasMore: autoFetchAll ? false : (data?.hasMore ?? false),
    nextCursor: autoFetchAll ? null : (data?.nextCursor ?? null),
    isLoading,
    isFullyLoaded: autoFetchAll ? !isLoading : (!isLoading && !data?.hasMore),
    error,
    mutate,
    loadMore
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
