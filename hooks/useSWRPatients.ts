import useSWR from 'swr';
import { useSession } from 'next-auth/react';
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

const allPatientsFetcher = async (scope: SessionScope | null, userEmail?: string) => {
  try {
    if (!navigator.onLine) {
        throw new Error('offline');
    }

    // Build cache key based on scope tier
    const cacheKey = scope?.staffName 
      ? `staff::${scope.staffName}` 
      : `${scope?.state ?? 'all'}::${scope?.district ?? 'all'}`;
    
    const cached = await getCachedPatients(cacheKey);
    if (cached.length > 0) return cached;

    const supabase = createClient(userEmail);
    
    // Step 1: Build count query with 3-tier RBAC
    let countQuery = supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });
    
    // Apply 3-tier data isolation
    if (scope?.staffName) {
      // Tier 3: Prison Coordinator - filter by staff name (case-insensitive, trimmed)
      countQuery = countQuery.ilike('staff_name', scope.staffName.trim());
    } else if (scope?.district) {
      // Tier 2b: District level - filter by state AND district
      countQuery = countQuery.eq('screening_state', scope.state!);
      countQuery = countQuery.eq('screening_district', scope.district);
    } else if (scope?.state) {
      // Tier 2a: State level - filter by state only
      countQuery = countQuery.eq('screening_state', scope.state);
    }
    // Tier 1: National level - no filters (admin, PM)

    const { count, error: countError } = await countQuery;
    if (countError || !count) return [];

    // Step 2: Fire all pages in parallel with same filters
    const batchSize = 1000;
    const pages = Math.ceil(count / batchSize);
    const fetches = Array.from({ length: pages }, (_, i) => {
      const supabase = createClient(userEmail);
      let q = supabase
        .from('patients')
        .select('*')
        .range(i * batchSize, (i + 1) * batchSize - 1);
      
      // Apply same 3-tier filters
      if (scope?.staffName) {
        q = q.ilike('staff_name', scope.staffName.trim());
      } else if (scope?.district) {
        q = q.eq('screening_state', scope.state!);
        q = q.eq('screening_district', scope.district);
      } else if (scope?.state) {
        q = q.eq('screening_state', scope.state);
      }
      
      return q;
    });

    const results = await Promise.all(fetches);
    const allData: any[] = [];
    for (const { data, error } of results) {
      if (error || !data) continue;
      allData.push(...data);
    }

    await cachePatients(allData, cacheKey);
    return allData;
  } catch (error) {
    console.error('[useSWRPatients] allPatientsFetcher failed:', error);
    return [];
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

export function useSWRAllPatients(scope: SessionScope | null) {
  const { data: session } = useSession();
  const key = session && scope 
    ? ['allPatients', scope.state ?? 'all', scope.district ?? 'all', scope.staffName ?? 'all'] 
    : null;
  
  const swr = useSWR(
    key,
    () => scope ? allPatientsFetcher(scope, session?.user?.email) : Promise.resolve([]),
    swrAllPatientsConfig
  );

  const localData = useLiveQuery(() => db.patients.toArray());

  return {
      ...swr,
      data: localData && localData.length > 0 ? localData : swr.data
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
