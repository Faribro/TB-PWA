import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { createClient } from '@/lib/supabase-client';
import { withRetry } from '@/lib/retryMechanism';
import { cachePatients, getCachedPatients } from '@/lib/cacheManager';
import { swrPaginatedConfig, swrAllPatientsConfig } from '@/lib/swrConfig';
import type { SessionScope } from '@/hooks/useSessionScope';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface FetchPatientsParams {
  page: number;
  pageSize: number;
  filters: any;
  searchTerm: string;
  sortBy: string;
  userState?: string;
}

const fetcher = async (key: string, params: FetchPatientsParams, userEmail?: string) => {
  const { page, pageSize, filters, searchTerm, sortBy, userState } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  if (!navigator.onLine) {
     throw new Error('offline');
  }

  return withRetry(async () => {
    const supabase = createClient(userEmail);
    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' });
    
    if (userState) {
      query = query.eq('screening_state', userState);
    }
    
    if (searchTerm) {
      query = query.or(`inmate_name.ilike.%${searchTerm}%,unique_id.ilike.%${searchTerm}%`);
    }
    // (Filters unchanged... skipping repeating them for brevity if possible? No, must replicate exactly!)
    if (filters.state) query = query.eq('screening_state', filters.state);
    if (filters.district) query = query.eq('screening_district', filters.district);
    if (filters.facilityType) query = query.eq('facility_type', filters.facilityType);
    if (filters.tbDiagnosed) query = query.eq('tb_diagnosed', filters.tbDiagnosed);
    if (filters.hivStatus) query = query.eq('hiv_status', filters.hivStatus);
    if (filters.dateFrom) query = query.gte('screening_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('screening_date', filters.dateTo);
    
    const { data, count, error } = await query
      .order(sortBy, { ascending: false, nullsFirst: false })
      .order('screening_date', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    if (data) {
        // Hydrate local PWA DB with fetched patients securely
        await db.patients.bulkPut(data);
    }

    return { data: data || [], count: count || 0 };
  }, {
    maxRetries: 3,
    onRetry: (attempt) => console.log(`[SWR] Retry attempt ${attempt} for paginated fetch`)
  });
};

// Role-based default page sizes — must match canonical Role values from lib/constants/roles.ts
const getDefaultPageSize = (role: string): number => {
  // Admin/PM: fetch all records (no limit)
  if (role === 'admin' || role === 'PM') {
    return 50000; // High limit for admin/PM
  }
  // Others: limit to 5000 to prevent timeouts
  return 5000;
};

const allPatientsFetcher = async (
  scope: SessionScope | null, 
  pageSize: number = 5000, // Default 5000, but admin/PM can override
  filters?: { state?: string; district?: string; dateFrom?: string; dateTo?: string; search?: string }
) => {
  // Build cache key based on scope + filters
  const filterKey = filters ? JSON.stringify(filters) : 'all';
  const cacheKey = scope?.staffName 
    ? `staff::${scope.staffName}::${filterKey}` 
    : `${scope?.state ?? 'all'}::${scope?.district ?? 'all'}::${filterKey}`;
  
  try {
    // NETWORK-FIRST: Always try to fetch fresh data when online
    if (!navigator.onLine) {
      throw new Error('offline');
    }

    // Build query URL with filters and cache-busting timestamp
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('pageSize', String(pageSize));
    params.set('_t', String(Date.now())); // Cache-busting timestamp
    if (filters?.state) params.set('state', filters.state);
    if (filters?.district) params.set('district', filters.district);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.search) params.set('search', filters.search);
    
    const url = `/api/patients?${params.toString()}`;
    console.log('[useSWRPatients] Fetching fresh data:', url);

    // Retry logic for transient errors (502, 503, 504)
    let response: Response;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    while (retryCount < maxRetries) {
      response = await fetch(url);

      if (response.ok) {
        break;
      }

      // Retry on 502, 503, 504, 429 (rate limit)
      const status = response.status;
      const isTransientError = status === 502 || status === 503 || status === 504 || status === 429;

      if (!isTransientError || retryCount === maxRetries - 1) {
        const errorText = await response.text();
        console.error('[useSWRPatients] API error:', status, errorText);
        
        // Try to return cached data if available
        const cached = localStorage.getItem('swr-patients-cache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            console.warn('[useSWRPatients] Using cached data due to API failure');
            return parsed.data || [];
          } catch (e) {
            console.error('[useSWRPatients] Failed to parse cached data');
          }
        }
        
        throw new Error(`API error: ${status}`);
      }

      retryCount++;
      console.warn(`[useSWRPatients] Transient error ${status}, retry ${retryCount}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.message || result.error);
    }
    
    console.log('[useSWRPatients] API response:', { 
      returned: result.data?.length, 
      total: result.meta?.total,
      batches: result.meta?.batches,
      duration: result.meta?.durationMs 
    });
    
    const data = result.data || [];
    
    // Update cache with fresh data
    if (data.length > 0) {
      await cachePatients(data, cacheKey);
    }
    
    return { 
      data, 
      meta: result.meta || { total: data.length, returned: data.length, cached: false }
    };
  } catch (error) {
    console.error('[useSWRPatients] Network fetch failed, trying cache:', error);
    
    // FALLBACK: Try cache if network failed
    try {
      const cached = await getCachedPatients(cacheKey);
      if (cached.length > 0) {
        console.log('[useSWRPatients] Returning cached data as fallback:', cached.length);
        return { data: cached, meta: { cached: true, count: cached.length, total: cached.length } };
      }
    } catch (cacheError) {
      console.error('[useSWRPatients] Cache fallback also failed:', cacheError);
    }
    
    // FINAL FALLBACK: Return empty
    return { data: [], meta: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export function useSWRPatients(params: FetchPatientsParams) {
  const { data: session } = useSession();
  const key = session ? ['patients', params.page, params.pageSize, params.filters, params.searchTerm, params.sortBy, params.userState] : null;
  
  // 1. Run SWR in background to hit Supabase and populate Dexie
  const swr = useSWR(
    key,
    () => fetcher(key![0], params, session?.user?.email),
    swrPaginatedConfig
  );

  // 2. Fetch lightning-fast local cache
  const localData = useLiveQuery(
    async () => {
      let coll = db.patients.orderBy('id').reverse();
      return coll.toArray();
    },
    [params.page, params.pageSize]
  );

  // 3. Return local first if available to make it feel instantly reactive
  return {
    ...swr,
    data: localData && localData.length > 0 ? { data: localData, count: localData.length } : swr.data,
  };
}

interface UseSWRAllPatientsOptions {
  pageSize?: number;
  filters?: {
    state?: string;
    district?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  };
}

export function useSWRAllPatients(
  scope: SessionScope | null, 
  options: UseSWRAllPatientsOptions = {}
) {
  const { data: session } = useSession();
  
  // Role-based page size
  const pageSize = useMemo(() => {
    return options.pageSize ?? getDefaultPageSize(session?.user?.role);
  }, [options.pageSize, session?.user?.role]);
  
  const { filters } = options;
  
  // Build SWR key
  const key = session && scope 
    ? ['/api/patients', scope.state ?? 'all', scope.district ?? 'all', scope.staffName ?? 'all', pageSize, JSON.stringify(filters)] 
    : null;
  
  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => allPatientsFetcher(scope, pageSize, filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,      // 30s dedup
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      keepPreviousData: true,
      onError: (err) => {
        console.error('[useSWRPatients]', err);
      }
    }
  );

  return {
    patients: data?.data ?? [],
    meta: data?.meta ?? null,
    total: data?.meta?.total ?? 0,
    isLoading,
    error,
    mutate,
    pageSize
  };
}

export function useSWRFilterMetadata(userState?: string) {
  const { data: session } = useSession();
  const key = session ? ['filterMetadata', userState] : null;
  
  return useSWR(key, async () => {
    return withRetry(async () => {
      const supabase = createClient(session?.user?.email);
      const batchSize = 5000;
      const allData: { screening_state: string; screening_district: string; facility_type: string }[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('patients')
          .select('screening_state, screening_district, facility_type')
          .range(offset, offset + batchSize - 1);
        
        if (userState) {
          query = query.eq('screening_state', userState);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...data);
          if (data.length < batchSize) {
            hasMore = false;
          } else {
            offset += batchSize;
          }
        } else {
          hasMore = false;
        }
      }
      
      if (allData.length > 0) {
        const states = [...new Set(allData.map(d => d.screening_state).filter(Boolean))];
        const locationMap = new Map<string, string[]>();
        
        allData.forEach(d => {
          if (d.screening_state && d.screening_district) {
            if (!locationMap.has(d.screening_state)) {
              locationMap.set(d.screening_state, []);
            }
            const districts = locationMap.get(d.screening_state)!;
            if (!districts.includes(d.screening_district)) {
              districts.push(d.screening_district);
            }
          }
        });
        
        const facilityTypes = [...new Set(allData.map(d => d.facility_type).filter(Boolean))];
        
        return { states, locationMap, facilityTypes };
      }
      return { states: [], locationMap: new Map(), facilityTypes: [] };
    }, {
      maxRetries: 3,
      onRetry: (attempt) => console.log(`[SWR] Retry attempt ${attempt} for filter metadata`)
    });
  });
}
