import useSWR from 'swr';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface FetchPatientsParams {
  page: number;
  pageSize: number;
  filters: any;
  searchTerm: string;
  sortBy: string;
  userState?: string;
}

const fetcher = async (key: string, params: FetchPatientsParams) => {
  const { page, pageSize, filters, searchTerm, sortBy, userState } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  let query = supabase.from('patients').select('*', { count: 'exact' });
  
  if (userState) {
    query = query.eq('screening_state', userState);
  }
  
  if (searchTerm) {
    query = query.or(`inmate_name.ilike.%${searchTerm}%,unique_id.ilike.%${searchTerm}%`);
  }
  if (filters.state) query = query.eq('screening_state', filters.state);
  if (filters.district) query = query.eq('screening_district', filters.district);
  if (filters.facilityType) query = query.eq('facility_type', filters.facilityType);
  if (filters.tbDiagnosed) query = query.eq('tb_diagnosed', filters.tbDiagnosed);
  if (filters.hivStatus) query = query.eq('hiv_status', filters.hivStatus);
  if (filters.dateFrom) query = query.gte('screening_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('screening_date', filters.dateTo);
  
  query = query.neq('facility_name', 'Unknown').neq('facility_type', 'Unknown');
  
  const { data, count } = await query
    .order(sortBy, { ascending: false, nullsFirst: false })
    .order('screening_date', { ascending: false })
    .range(from, to);
  
  return { data: data || [], count: count || 0 };
};

const allPatientsFetcher = async (userState?: string) => {
  console.log('[SWR] allPatientsFetcher starting...', { userState });
  const batchSize = 1000;
  let allData: any[] = [];
  
  const fetchBatch = async (offset: number) => {
    let query = supabase
      .from('patients')
      .select('*')
      .neq('facility_name', 'Unknown')
      .neq('facility_type', 'Unknown')
      .range(offset, offset + batchSize - 1);
    
    if (userState) {
      query = query.eq('screening_state', userState);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('[SWR] Batch fetch error:', error);
      throw error;
    }
    console.log(`[SWR] Batch at offset ${offset}: ${data?.length || 0} records`);
    return data || [];
  };
  
  try {
    const firstBatch = await fetchBatch(0);
    allData = firstBatch;
    console.log('[SWR] First batch complete:', allData.length);
    
    if (firstBatch.length === batchSize) {
      const parallelBatches = 21;
      let from = batchSize;
      let hasMore = true;
      
      while (hasMore) {
        const batchPromises = [];
        for (let i = 0; i < parallelBatches; i++) {
          batchPromises.push(fetchBatch(from + (i * batchSize)));
        }
        
        const results = await Promise.all(batchPromises);
        hasMore = false;
        
        for (const batch of results) {
          if (batch.length > 0) {
            allData.push(...batch);
            if (batch.length === batchSize) {
              hasMore = true;
            }
          }
        }
        
        from += parallelBatches * batchSize;
      }
    }
    
    console.log('[SWR] allPatientsFetcher complete:', allData.length, 'records');
    return allData;
  } catch (error) {
    console.error('[SWR] allPatientsFetcher failed:', error);
    throw error;
  }
};

export function useSWRPatients(params: FetchPatientsParams) {
  const key = ['patients', params.page, params.pageSize, params.filters, params.searchTerm, params.sortBy, params.userState];
  
  return useSWR(
    key,
    () => fetcher(key[0], params),
    {
      revalidateOnMount: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // 30 seconds for paginated data
      keepPreviousData: true,
      refreshInterval: 0,
      errorRetryCount: 2,
      focusThrottleInterval: 60000, // 1 minute
    }
  );
}

export function useSWRAllPatients(userState?: string) {
  return useSWR(['allPatients', userState], () => allPatientsFetcher(userState), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    dedupingInterval: 1800000,
    keepPreviousData: true,
    refreshInterval: 0,
    errorRetryCount: 2,
    errorRetryInterval: 5000,
    focusThrottleInterval: 300000
  });
}

export function useSWRFilterMetadata(userState?: string) {
  return useSWR(['filterMetadata', userState], async () => {
    let query = supabase
      .from('patients')
      .select('screening_state, screening_district, facility_type')
      .limit(20000);
    
    if (userState) {
      query = query.eq('screening_state', userState);
    }
    
    const { data } = await query;
    
    if (data) {
      const states = [...new Set(data.map(d => d.screening_state).filter(Boolean))];
      const locationMap = new Map<string, string[]>();
      
      data.forEach(d => {
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
      
      const facilityTypes = [...new Set(data.map(d => d.facility_type).filter(Boolean))];
      
      return { states, locationMap, facilityTypes };
    }
    return { states: [], locationMap: new Map(), facilityTypes: [] };
  });
}
