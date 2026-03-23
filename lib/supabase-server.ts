import { createClient } from '@supabase/supabase-js';

export const createServerClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
};

/**
 * Fetches ALL patients from Supabase using paginated batch requests.
 * Avoids the single-request row limit by fetching in batches of 1000
 * and accumulating results until no more rows are returned.
 */
export const getPatients = async (state?: string) => {
  const supabase = createServerClient();
  const batchSize = 1000;
  const allData: any[] = [];
  let offset = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      let query = supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + batchSize - 1);

      if (state) {
        query = query.eq('screening_state', state);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase batch error at offset', offset, ':', error);
        break;
      }

      if (data && data.length > 0) {
        allData.push(...data);
        if (data.length < batchSize) {
          hasMore = false; // Last batch
        } else {
          offset += batchSize;
        }
      } else {
        hasMore = false;
      }
    }

    console.log('Fetched patients (paginated):', allData.length);
    return allData;
  } catch (err) {
    console.error('getPatients failed:', err);
    return allData.length > 0 ? allData : [];
  }
};
