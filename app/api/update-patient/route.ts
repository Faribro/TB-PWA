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
    syncToGoogleSheets(uniqueId, updates).catch(err => {
      console.error('Sheets sync failed:', err);
      logFailedSync(uniqueId, updates, err.message);
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function syncToGoogleSheets(uniqueId: string, updates: Record<string, any>) {
  const GOOGLE_APPSCRIPT_URL = process.env.GOOGLE_APPSCRIPT_URL;
  
  if (!GOOGLE_APPSCRIPT_URL) {
    console.warn('⚠️ GOOGLE_APPSCRIPT_URL not configured, skipping Sheets sync');
    return;
  }

  const payload = {
    action: 'update_patient',
    uniqueId,
    updates
  };

  const response = await fetch(GOOGLE_APPSCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`Sheets sync failed: ${response.status} ${response.statusText}`);
  }
}

async function logFailedSync(uniqueId: string, updates: Record<string, any>, error: string) {
  await supabase.from('sync_failures').insert({
    unique_id: uniqueId,
    updates: JSON.stringify(updates),
    error_message: error,
    created_at: new Date().toISOString()
  });
}
