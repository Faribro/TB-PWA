'use client';

import { createBrowserClient } from '@supabase/ssr';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  // Only create client in browser environment
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowserClient can only be called in the browser');
  }

  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseKey);

  return browserClient;
}
