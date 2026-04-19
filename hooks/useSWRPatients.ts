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
  
  const progressive = options.progressive ?? false;
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
  
  const key = session && scope
    ? ['/api/patients', scope.state ?? 'all', scope.district ?? 'all', limit, JSON.stringify(filters)]
    : null;
  
  const { data, error, isLoading, mutate } = useSWR(
    key,
    async () => {
      // Abort any in-flight background loading
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      backgroundLoadingRef.current = false;
      
      // Fetch first page immediately
      const firstPage = await cursorFetcher(scope, limit, filters, null);
      
      if (!progressive) {
        // Non-progressive mode: return first page only
        return {
          data: firstPage.data,
          nextCursor: firstPage.nextCursor,
          hasMore: firstPage.hasMore,
          meta: {
            ...firstPage.meta,
            pages: 1,
            progressive: false
          }
        };
      }
      
      // Progressive mode: return first page, start background loading
      return {
        data: firstPage.data,
        nextCursor: firstPage.nextCursor,
        hasMore: firstPage.hasMore,
        meta: {
          ...firstPage.meta,
          pages: 1,
          progressive: true
        }
      };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      keepPreviousData: false, // Don't keep stale data on filter change
      onError: (err) => {
        console.error('[useSWRPatients] Error:', err);
      }
    }
  );
  
  // Background loading effect
  useEffect(() => {
    if (!progressive || !data || !data.hasMore || backgroundLoadingRef.current) {
      return;
    }
    
    backgroundLoadingRef.current = true;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    (async () => {
      try {
        const allRecords = [...data.data];
        let cursor = data.nextCursor;
        let hasMore = data.hasMore;
        let iterations = 1;
        const startTime = Date.now();
        
        console.log('[useSWRPatients] Starting background load from page 2');
        
        while (hasMore && iterations < maxPages && allRecords.length < maxRecords) {
          if (controller.signal.aborted) {
            console.log('[useSWRPatients] Background load aborted');
            return;
          }
          
          setProgressState(prev => ({ ...prev, isLoadingMore: true }));
          
          const page = await cursorFetcher(scope, limit, filters, cursor);
          
          if (controller.signal.aborted) {
            return;
          }
          
          allRecords.push(...page.data);
          cursor = page.nextCursor;
          hasMore = page.hasMore;
          iterations++;
          
          // Update progress (guarded to prevent unnecessary re-renders)
          setProgressState(prev => {
            const newLoadedCount = allRecords.length;
            const newProgress = prev.totalCount > 0 ? Math.round((newLoadedCount / prev.totalCount) * 100) : 0;
            
            // Guard: Only update if values actually changed
            if (prev.loadedCount === newLoadedCount && prev.progress === newProgress && prev.isLoadingMore === hasMore) {
              return prev;
            }
            
            return {
              loadedCount: newLoadedCount,
              totalCount: prev.totalCount,
              isLoadingMore: hasMore,
              progress: newProgress
            };
          });
          
          // Update SWR cache with accumulated data
          mutate({
            data: allRecords,
            nextCursor: cursor,
            hasMore,
            meta: {
              returned: allRecords.length,
              requestedLimit: limit,
              role: scope?.role || 'unknown',
              durationMs: Date.now() - startTime,
              mode: 'cursor' as const,
              pages: iterations,
              progressive: true
            }
          }, false);
          
          console.log(`[useSWRPatients] Background page ${iterations}: +${page.data.length}, total: ${allRecords.length}`);
          
          if (!hasMore) break;
          
          if (iterations >= maxPages) {
            console.warn(`[useSWRPatients] Hit maxPages (${maxPages})`);
            break;
          }
          
          if (allRecords.length >= maxRecords) {
            console.warn(`[useSWRPatients] Hit maxRecords (${maxRecords})`);
            break;
          }
        }
        
        const durationMs = Date.now() - startTime;
        console.log(`[useSWRPatients] ✅ Background load complete: ${allRecords.length} in ${iterations} pages (${durationMs}ms)`);
        
        setProgressState(prev => ({
          ...prev,
          isLoadingMore: false,
          progress: 100
        }));
        
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('[useSWRPatients] Background load error:', err);
          setProgressState(prev => ({ ...prev, isLoadingMore: false }));
        }
      }
    })();
    
    return () => {
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [data, progressive, scope, limit, filters, maxPages, maxRecords, mutate]);
  
  // Update total count from external source (guarded to prevent unnecessary updates)
  const setTotalCount = useCallback((total: number) => {
    setProgressState(prev => {
      // Guard: Only update if total actually changed
      if (prev.totalCount === total) return prev;
      
      return {
        ...prev,
        totalCount: total,
        progress: prev.loadedCount > 0 && total > 0 ? Math.round((prev.loadedCount / total) * 100) : 0
      };
    });
  }, []);
  
  // Reset progress on filter change
  useEffect(() => {
    setProgressState({
      loadedCount: 0,
      totalCount: 0,
      isLoadingMore: false,
      progress: 0
    });
  }, [key]);

  return {
    patients: data?.data ?? [],
    meta: data?.meta ?? null,
    total: data?.data?.length ?? 0,
    hasMore: data?.hasMore ?? false,
    nextCursor: data?.nextCursor ?? null,
    isLoading,
    isLoadingMore: progressState.isLoadingMore,
    loadedCount: progressState.loadedCount || (data?.data?.length ?? 0),
    totalCount: progressState.totalCount,
    progress: progressState.progress,
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
