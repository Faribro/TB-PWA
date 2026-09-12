'use client';

import { createBrowserClient } from '@supabase/ssr';

let browserClient: any = null;

const DEFAULT_SUPABASE_URL = 'https://fgtrkxadiszoyhslwesu.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndHJreGFkaXN6b3loc2x3ZXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODk5NDEsImV4cCI6MjA4ODI2NTk0MX0.-6bbuayttYMEhSKih0T4yUU_FFFvuKcWtrxW9yiwDE8';

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  try {
    browserClient = createBrowserClient(supabaseUrl, supabaseKey);
    return browserClient;
  } catch (err) {
    console.warn('[supabase-browser] Falling back to safe mock client:', err);
    return {
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ error: null }),
        update: () => Promise.resolve({ error: null }),
        delete: () => Promise.resolve({ error: null })
      }),
      channel: () => ({
        on: () => ({ subscribe: () => ({}) }),
        subscribe: () => ({})
      }),
      removeChannel: () => {},
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
    } as any;
  }
}
