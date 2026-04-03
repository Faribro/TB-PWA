import { createClient } from '@supabase/supabase-js';

// Lazy Supabase client creation to avoid build-time errors
// This function creates a new client on each call, which is safe for serverless
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase environment variables not configured');
  }
  
  return createClient(url, key);
}
