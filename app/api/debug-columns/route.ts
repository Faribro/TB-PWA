export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  // Initialize Supabase client at request time (not build time)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    // Get first record to see actual column names
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const columns = data ? Object.keys(data).sort() : [];

    return NextResponse.json({
      totalColumns: columns.length,
      columns: columns,
      sampleRecord: data
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
