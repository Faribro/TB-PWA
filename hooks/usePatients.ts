import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export function usePatients(page: number, pageSize: number, filters: any, searchTerm: string, sortBy: string) {
  return useQuery({
    queryKey: ['patients', page, pageSize, filters, searchTerm, sortBy],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      let query = supabase.from('patients').select('*', { count: 'exact' });
      
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
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useAllPatients() {
  return useQuery({
    queryKey: ['allPatients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .neq('facility_name', 'Unknown')
        .neq('facility_type', 'Unknown');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
