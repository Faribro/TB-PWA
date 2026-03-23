import useSWR from 'swr';
import { createClient } from '@supabase/supabase-js';
import { withRetry } from '@/lib/retryMechanism';
import { cachePatients, getCachedPatients } from '@/lib/cacheManager';
import { swrPaginatedConfig, swrAllPatientsConfig } from '@/lib/swrConfig';

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
  
  return withRetry(async () => {
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
    
    const { data, count, error } = await query
      .order(sortBy, { ascending: false, nullsFirst: false })
      .order('screening_date', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    // Filter out Unknown values client-side
    const filtered = (data || []).filter(p => 
      p.facility_name !== 'Unknown' && p.facility_type !== 'Unknown'
    );
    
    return { data: filtered, count: count || 0 };
  }, {
    maxRetries: 3,
    onRetry: (attempt) => console.log(`[SWR] Retry attempt ${attempt} for paginated fetch`)
  });
};

const allPatientsFetcher = async (userState?: string) => {
  try {
    // Try cache first
    const cached = await getCachedPatients();
    if (cached.length > 0) {
      return cached;
    }
    
    const batchSize = 1000;
    const allData: any[] = [];
    let offset = 0;
    let hasMore = true;
    
    // Task 3: Sequential batch fetching to bypass 1000-row limit
    while (hasMore) {
      const { data, error } = await withRetry(async () => {
        let query = supabase
          .from('patients')
          .select('*')
          .range(offset, offset + batchSize - 1);
        
        if (userState) {
          query = query.eq('screening_state', userState);
        }
        
        return query;
      }, {
        maxRetries: 3,
        onRetry: (attempt) => console.log(`[SWR] Retry attempt ${attempt} for batch at offset ${offset}`)
      });
      
      if (error || !data) break;
      
      // Filter out Unknown values client-side
      const filtered = data.filter(p => 
        p.facility_name !== 'Unknown' && p.facility_type !== 'Unknown'
      );
      
      allData.push(...filtered);
      hasMore = data.length === batchSize;
      offset += batchSize;
    }
    
    // Cache the results
    await cachePatients(allData);
    
    return allData;
  } catch (error) {
    console.error('[useSWRPatients] allPatientsFetcher failed:', error);
    return [];
  }
};

export function useSWRPatients(params: FetchPatientsParams) {
  const key = ['patients', params.page, params.pageSize, params.filters, params.searchTerm, params.sortBy, params.userState];
  
  return useSWR(
    key,
    () => fetcher(key[0], params),
    swrPaginatedConfig
  );
}

export function useSWRAllPatients(userState?: string) {
  return useSWR(
    ['allPatients', userState], 
    () => allPatientsFetcher(userState), 
    swrAllPatientsConfig
  );
}

export function useSWRFilterMetadata(userState?: string) {
  return useSWR(['filterMetadata', userState], async () => {
    return withRetry(async () => {
      // Paginated fetch for filter metadata — lightweight columns only
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
