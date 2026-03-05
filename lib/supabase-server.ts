import { createClient } from '@supabase/supabase-js';

export const createServerClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
};

export const getPatients = async (state?: string) => {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100000);
  
  if (error) {
    console.error('Supabase error:', error);
    return [];
  }
  
  console.log('Fetched patients:', data?.length);
  return data || [];
};
