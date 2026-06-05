import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { useSession } from 'next-auth/react';
import { useMemo, useCallback } from 'react';
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
    facilityType?: string;
    tbDiagnosed?: string;
    suspected?: string;
    treatmentStatus?: string;
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
    mode: 'cursor';
    total?: number;
  };
}

export function useSWRAllPatients(
  scope: SessionScope | null,
  options: UseSWRAllPatientsOptions = {}
) {
  const { data: session } = useSession();
  
  const limit = options.limit ?? 50; // request page 1 (limit=50) on initial mount
  const { filters } = options;
  
  // SWR Infinite Key Generator
  const getKey = (pageIndex: number, previousPageData: CursorPaginationResponse | null) => {
    if (!session) return null;
    
    // If we've reached the end (hasMore is false)
    if (pageIndex > 0 && previousPageData && !previousPageData.hasMore) return null;
    
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    
    // Feed the previous nextCursor UUID string forward
    if (pageIndex > 0 && previousPageData?.nextCursor) {
      params.set('cursor', previousPageData.nextCursor);
    }
    
    if (filters?.state) params.set('state', filters.state);
    if (filters?.district) params.set('district', filters.district);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.facilityType) params.set('facilityType', filters.facilityType);
    if (filters?.tbDiagnosed) params.set('tbDiagnosed', filters.tbDiagnosed);
    if (filters?.suspected) params.set('suspected', filters.suspected);
    if (filters?.treatmentStatus) params.set('treatmentStatus', filters.treatmentStatus);
    
    return `/api/patients?${params.toString()}`;
  };

  const { data, error, isLoading, size, setSize, mutate, isValidating } = useSWRInfinite<CursorPaginationResponse>(
    getKey,
    async (url: string) => {
      console.log('[useSWRPatients] Fetching infinite page:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const result = await response.json();
      if (result.error) {
        throw new Error(result.message || result.error);
      }
      return result;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      persistSize: true,
      dedupingInterval: 10000, // 10s deduping
    }
  );

  const patients = useMemo(() => {
    if (!data) return [];
    return data.flatMap(page => page.data);
  }, [data]);

  const hasMore = data ? data[data.length - 1]?.hasMore : false;
  const nextCursor = data ? data[data.length - 1]?.nextCursor : null;
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined');

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && !isValidating) {
      setSize(prevSize => prevSize + 1);
    }
  }, [hasMore, isLoadingMore, isValidating, setSize]);

  const currentLoadedCount = patients.length;
  // Use metadata count if available, otherwise fallback to current loaded count
  const apiTotalCount = data ? (data[data.length - 1]?.meta?.total ?? currentLoadedCount) : currentLoadedCount;

  return {
    patients,
    meta: data ? data[data.length - 1]?.meta : null,
    total: apiTotalCount,
    hasMore,
    nextCursor,
    isLoading,
    isLoadingMore,
    loadedCount: currentLoadedCount,
    totalCount: apiTotalCount,
    progress: 100,
    isPartialLoad: false,
    cappedReason: null,
    error,
    mutate,
    loadMore,
    setSize,
    size,
    setTotalCount: (total: number) => {}
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
