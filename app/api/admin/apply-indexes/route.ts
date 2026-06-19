export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    await supabase.rpc('exec', {
      query: 'CREATE INDEX IF NOT EXISTS idx_profiles_email_active ON profiles(email, is_active) WHERE is_active = true'
    });

    await supabase.rpc('exec', {
      query: 'CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email)'
    });

    return NextResponse.json({ success: true, message: 'Indexes created' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
