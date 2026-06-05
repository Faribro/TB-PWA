'use client';

import { createBrowserClient } from '@supabase/ssr';

export const createClient = (userEmail?: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (typeof window === 'undefined') {
      return {} as any;
    }
    throw new Error('Missing Supabase environment variables');
  }

  const client = createBrowserClient(
    supabaseUrl,
    supabaseKey,
    {
      global: {
        headers: userEmail ? { 'x-user-email': userEmail } : {},
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );
  
  return client;
};
