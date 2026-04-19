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
  const currentSessionIdRef = useRef<string | null>(null);
  
  const key = session && scope
    ? ['/api/patients', scope.state ?? 'all', scope.district ?? 'all', limit, JSON.stringify(filters)]
    : null;
  
  // Stable key for effect - only changes on filter/scope change, NOT on data updates
  const stableEffectKey = useMemo(() => key ? JSON.stringify(key) : null, [key ? JSON.stringify(key) : null]);
  
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
      const firstPage = await cursorFetcher(scope, limit, filters, null, true);
      
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
  
  // Track initial data to prevent effect re-runs during background loading
  const filtersRef = useRef(filters);
  const [shouldStartLoading, setShouldStartLoading] = useState(false);
  const hasCompletedLoadRef = useRef(false);
  
  // Update filters ref
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  
  // Watch for first page data arrival and trigger loading flag
  useEffect(() => {
    if (!progressive || !data?.data) return;
    
    // Only trigger if this is first page data (exactly limit records, pages === 1)
    // AND we haven't already completed a load for this filter set
    if (data.data.length === limit && data.meta?.pages === 1 && data.hasMore && data.nextCursor && !hasCompletedLoadRef.current) {
      console.log('[useSWRPatients] First page data detected, setting shouldStartLoading=true');
      setShouldStartLoading(true);
    }
  }, [data?.data?.length, data?.meta?.pages, data?.hasMore, progressive, limit]);
  
  // Reset loading flag on filter change
  useEffect(() => {
    setShouldStartLoading(false);
    hasCompletedLoadRef.current = false;
  }, [stableEffectKey]);
  
  // Background loading effect - triggers ONCE when shouldStartLoading becomes true
  // Does NOT depend on data, so cache mutations don't retrigger it
  useEffect(() => {
    if (!shouldStartLoading || !progressive) {
      return;
    }
    
    if (backgroundLoadingRef.current) {
      console.log('[useSWRPatients] Background loading already in progress');
      return;
    }
    
    // Get current data snapshot
    if (!data?.data || data.data.length !== limit || !data.hasMore || !data.nextCursor) {
      console.log('[useSWRPatients] Data not ready for background load');
      return;
    }
    
    // Abort any previous session
    if (abortControllerRef.current) {
      console.log('[useSWRPatients] Aborting previous session');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    const sessionId = Date.now().toString();
    currentSessionIdRef.current = sessionId;
    backgroundLoadingRef.current = true;
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    console.log(`[useSWRPatients] [${sessionId}] Starting background load session`);
    
    setProgressState(prev => ({
      ...prev,
      loadedCount: data.data.length,
      isLoadingMore: true
    }));
    
    (async () => {
      try {
        const allRecords = [...data.data];
        let cursor = data.nextCursor;
        let hasMore = data.hasMore;
        let iterations = 1;
        const startTime = Date.now();
        
        console.log(`[useSWRPatients] [${sessionId}] Starting background load from page 2, cursor:`, cursor);
        
        while (hasMore && cursor && iterations < maxPages && allRecords.length < maxRecords) {
          if (controller.signal.aborted) {
            console.log(`[useSWRPatients] [${sessionId}] Background load aborted`);
            return;
          }
          
          console.log(`[useSWRPatients] [${sessionId}] Fetching page ${iterations + 1} with cursor:`, cursor);
          const page = await cursorFetcher(scope, limit, filtersRef.current, cursor, true);
          console.log(`[useSWRPatients] [${sessionId}] Page ${iterations + 1} response:`, {
            dataLength: page.data.length,
            hasMore: page.hasMore,
            nextCursor: page.nextCursor
          });
          
          if (controller.signal.aborted) {
            console.log(`[useSWRPatients] [${sessionId}] Aborted after fetch`);
            return;
          }
          
          allRecords.push(...page.data);
          cursor = page.nextCursor;
          hasMore = page.hasMore;
          iterations++;
          
          // Update progress
          setProgressState(prev => ({
            loadedCount: allRecords.length,
            totalCount: prev.totalCount,
            isLoadingMore: hasMore,
            progress: prev.totalCount > 0 ? Math.min(100, Math.round((allRecords.length / prev.totalCount) * 100)) : 0
          }));
          
          // Update SWR cache with accumulated data (revalidate: false prevents effect re-trigger)
          console.log(`[useSWRPatients] [${sessionId}] Updating cache with ${allRecords.length} records`);
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
          }, { revalidate: false });
          
          console.log(`[useSWRPatients] [${sessionId}] Background page ${iterations + 1}: +${page.data.length}, total: ${allRecords.length}, hasMore: ${hasMore}, cursor: ${cursor}`);
          
          if (!hasMore || !cursor) {
            console.log(`[useSWRPatients] [${sessionId}] Breaking: hasMore=${hasMore}, cursor=${cursor}`);
            break;
          }
          
          if (iterations >= maxPages) {
            console.warn(`[useSWRPatients] [${sessionId}] Hit maxPages (${maxPages})`);
            break;
          }
          
          if (allRecords.length >= maxRecords) {
            console.warn(`[useSWRPatients] [${sessionId}] Hit maxRecords (${maxRecords})`);
            break;
          }
        }
        
        const durationMs = Date.now() - startTime;
        console.log(`[useSWRPatients] [${sessionId}] ✅ Background load complete: ${allRecords.length} in ${iterations + 1} pages (${durationMs}ms)`);
        
        // Mark as completed to prevent re-triggering
        hasCompletedLoadRef.current = true;
        
        setProgressState(prev => ({
          ...prev,
          isLoadingMore: false,
          progress: 100
        }));
        
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(`[useSWRPatients] [${sessionId}] Background load error:`, err);
          setProgressState(prev => ({ ...prev, isLoadingMore: false }));
        }
      } finally {
        console.log(`[useSWRPatients] [${sessionId}] Cleaning up`);
        if (currentSessionIdRef.current === sessionId) {
          backgroundLoadingRef.current = false;
          abortControllerRef.current = null;
        }
      }
    })();
    
    return () => {
      console.log(`[useSWRPatients] [${sessionId}] Effect cleanup - aborting session`);
      controller.abort();
      if (currentSessionIdRef.current === sessionId) {
        backgroundLoadingRef.current = false;
        abortControllerRef.current = null;
      }
    };
  }, [shouldStartLoading, progressive, limit, scope, maxPages, maxRecords, mutate]);
  
  // Update total count from external source
  const setTotalCount = useCallback((total: number) => {
    setProgressState(prev => {
      const loadedCount = prev.loadedCount || (data?.data?.length ?? 0);
      return {
        ...prev,
        totalCount: total,
        progress: loadedCount > 0 && total > 0 ? Math.min(100, Math.round((loadedCount / total) * 100)) : 0
      };
    });
  }, [data?.data?.length]);
  
  // Reset progress on filter/scope change
  useEffect(() => {
    setProgressState({
      loadedCount: 0,
      totalCount: 0,
      isLoadingMore: false,
      progress: 0
    });
  }, [stableEffectKey]);

  const currentLoadedCount = data?.data?.length ?? 0;
  const displayProgress = progressState.totalCount > 0 && currentLoadedCount > 0
    ? Math.min(100, Math.round((currentLoadedCount / progressState.totalCount) * 100))
    : 0;

  return {
    patients: data?.data ?? [],
    meta: data?.meta ?? null,
    total: data?.data?.length ?? 0,
    hasMore: data?.hasMore ?? false,
    nextCursor: data?.nextCursor ?? null,
    isLoading,
    isLoadingMore: progressState.isLoadingMore,
    loadedCount: currentLoadedCount,
    totalCount: progressState.totalCount,
    progress: displayProgress,
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
