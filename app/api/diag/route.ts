import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== 'samadhaan_diag_2026') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results: Record<string, unknown> = {};

  // 1. Env vars
  results.env = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING',
    SERVICE_KEY_PREFIX: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 40) ?? 'MISSING',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
    AUTH_SECRET: process.env.AUTH_SECRET ? 'SET' : 'MISSING',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'MISSING',
  };

  // 2. Supabase connection + profiles table
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: sample, error: sampleErr, count } = await sb
      .from('profiles')
      .select('email, role', { count: 'exact' })
      .limit(3);

    results.profiles_table = {
      error: sampleErr?.message ?? null,
      total_count: count,
      sample,
    };

    // 3. Exact lookup for admin user
    const { data: admin, error: adminErr } = await sb
      .from('profiles')
      .select('*')
      .eq('email', 'faridsayyed1010@gmail.com')
      .single();

    results.admin_lookup = {
      found: !!admin,
      error: adminErr?.message ?? null,
      row: admin,
    };

    // 4. Check columns
    const { data: cols, error: colErr } = await sb
      .rpc('get_profiles_columns')
      .select('*');

    // fallback: just try selecting all known column variants
    const { data: colTest, error: colTestErr } = await sb
      .from('profiles')
      .select('email, role, state, district, assigned_state, assigned_district, staff_name')
      .eq('email', 'faridsayyed1010@gmail.com')
      .single();

    results.column_test = {
      error: colTestErr?.message ?? null,
      data: colTest,
    };

  } catch (err: any) {
    results.supabase_exception = err.message;
  }

  return NextResponse.json(results, { status: 200 });
}
