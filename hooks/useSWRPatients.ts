import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useMemo, useCallback } from 'react';
import type { SessionScope } from '@/hooks/useSessionScope';

interface UseSWRAllPatientsOptions {
  limit?: number;
  autoFetchAll?: boolean; // Enable auto-pagination (default: false for safety)
  maxPages?: number; // Safety cap on pages (default: 50)
  maxRecords?: number; // Safety cap on total records (default: 500k)
  timeout?: number; // Timeout in ms (default: 60s)
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
    pages?: number;
    autoFetchAll?: boolean;
    isPartial?: boolean;
    cappedBy?: 'maxPages' | 'maxRecords' | 'timeout';
    cappedReason?: string; // Human-readable explanation
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
  
  const autoFetchAll = options.autoFetchAll ?? false; // Default FALSE for safety
  const maxPages = options.maxPages ?? 50;
  const maxRecords = options.maxRecords ?? 500000;
  const timeout = options.timeout ?? 60000;
  const { filters } = options;
  
  const key = session && scope
    ? ['/api/patients', scope.state ?? 'all', scope.district ?? 'all', limit, JSON.stringify(filters), autoFetchAll]
    : null;
  
  const { data, error, isLoading, mutate } = useSWR(
    key,
    async () => {
      if (!autoFetchAll) {
        return await cursorFetcher(scope, limit, filters, null);
      }
      
      // Auto-pagination with safeguards
      const allRecords: any[] = [];
      let cursor: string | null = null;
      let hasMore = true;
      let iterations = 0;
      const startTime = Date.now();
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeout);
      
      console.log(`[useSWRPatients] Auto-fetch: maxPages=${maxPages}, maxRecords=${maxRecords}, timeout=${timeout}ms`);
      
      try {
        while (hasMore && iterations < maxPages && allRecords.length < maxRecords) {
          if (abortController.signal.aborted) {
            console.warn(`[useSWRPatients] ⚠️ Timeout after ${iterations} pages, ${allRecords.length} records`);
            break;
          }
          
          const page = await cursorFetcher(scope, limit, filters, cursor);
          allRecords.push(...page.data);
          cursor = page.nextCursor;
          hasMore = page.hasMore;
          iterations++;
          
          console.log(`[useSWRPatients] Page ${iterations}: +${page.data.length}, total: ${allRecords.length}, hasMore: ${hasMore}`);
          
          if (!hasMore) break;
          
          if (iterations >= maxPages) {
            console.warn(`[useSWRPatients] ⚠️ Hit maxPages (${maxPages})`);
            break;
          }
          
          if (allRecords.length >= maxRecords) {
            console.warn(`[useSWRPatients] ⚠️ Hit maxRecords (${maxRecords})`);
            break;
          }
        }
      } catch (err) {
        console.error(`[useSWRPatients] ❌ Error at page ${iterations}:`, err);
        if (allRecords.length > 0) {
          console.warn(`[useSWRPatients] Returning partial: ${allRecords.length} records`);
        } else {
          throw err;
        }
      } finally {
        clearTimeout(timeoutId);
      }
      
      const durationMs = Date.now() - startTime;
      const isPartial = hasMore || iterations >= maxPages || allRecords.length >= maxRecords;
      
      // Determine cap reason with human-readable message
      let cappedBy: 'maxPages' | 'maxRecords' | 'timeout' | undefined;
      let cappedReason: string | undefined;
      
      if (isPartial) {
        if (iterations >= maxPages) {
          cappedBy = 'maxPages';
          cappedReason = `Reached maximum page limit (${maxPages} pages). Showing first ${allRecords.length.toLocaleString()} records.`;
        } else if (allRecords.length >= maxRecords) {
          cappedBy = 'maxRecords';
          cappedReason = `Reached maximum record limit (${maxRecords.toLocaleString()} records). Refine filters to see more.`;
        } else {
          cappedBy = 'timeout';
          cappedReason = `Request timed out after ${(timeout / 1000).toFixed(0)}s. Showing ${allRecords.length.toLocaleString()} records loaded so far.`;
        }
        console.warn(`[useSWRPatients] ⚠️ PARTIAL: ${cappedReason}`);
      } else {
        console.log(`[useSWRPatients] ✅ Complete: ${allRecords.length} in ${iterations} pages (${durationMs}ms)`);
      }
      
      return {
        data: allRecords,
        nextCursor: hasMore ? cursor : null,
        hasMore,
        meta: {
          returned: allRecords.length,
          requestedLimit: limit,
          role: scope?.role || 'unknown',
          durationMs,
          mode: 'cursor' as const,
          pages: iterations,
          autoFetchAll: true,
          isPartial,
          cappedBy,
          cappedReason
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
      console.warn('[useSWRPatients] loadMore() called but autoFetchAll enabled');
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
    total: data?.data?.length ?? 0,
    hasMore: autoFetchAll ? false : (data?.hasMore ?? false),
    nextCursor: autoFetchAll ? null : (data?.nextCursor ?? null),
    isLoading,
    isFullyLoaded: autoFetchAll ? (!isLoading && !data?.meta?.isPartial) : (!isLoading && !data?.hasMore),
    isPartialLoad: data?.meta?.isPartial ?? false,
    cappedBy: data?.meta?.cappedBy,
    cappedReason: data?.meta?.cappedReason,
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
