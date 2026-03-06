import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { uniqueId, updates } = await req.json();

    // 1. SYNC: Update Supabase immediately
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('unique_id', uniqueId)
      .select()
      .single();

    if (error) throw error;

    // 2. ASYNC: Trigger Google Sheets sync (non-blocking)
    for (const [field, value] of Object.entries(updates)) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sync-sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueId, field, value })
      }).catch(err => {
        console.error('Sheets sync failed:', err);
        logFailedSync(uniqueId, field, value, err.message);
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function logFailedSync(uniqueId: string, field: string, value: any, error: string) {
  await supabase.from('sync_failures').insert({
    unique_id: uniqueId,
    field,
    value: JSON.stringify(value),
    error_message: error,
    created_at: new Date().toISOString()
  });
}
