'use client';

import { createBrowserClient } from '@supabase/ssr';

export const createClient = (userEmail?: string) => {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
