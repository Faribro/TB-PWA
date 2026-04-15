import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Enable RLS
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY'
    }).catch(() => {});

    // Drop existing policies
    await supabase.rpc('exec_sql', {
      sql: 'DROP POLICY IF EXISTS "service_role_all_access" ON profiles'
    }).catch(() => {});

    // Create service role policy
    const { error } = await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "service_role_all_access" ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true)`
    });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'Profiles RLS fixed - service role can now access profiles table' 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      hint: 'Try running SQL manually in Supabase dashboard'
    }, { status: 500 });
  }
}
