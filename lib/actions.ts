'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UpdatePayload {
  uniqueId: string;
  field: string;
  value: any;
}

export async function updatePatient(payload: UpdatePayload) {
  try {
    // 1. SYNCHRONOUS: Update Supabase immediately
    const { data, error } = await supabase
      .from('patients')
      .update({ [payload.field]: payload.value })
      .eq('unique_id', payload.uniqueId)
      .select()
      .single();

    if (error) throw error;

    // 2. ASYNCHRONOUS: Trigger Google Sheets sync (non-blocking)
    syncToGoogleSheets(payload).catch(err => {
      console.error('Google Sheets sync failed:', err);
      logFailedSync(payload, err.message);
    });

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function syncToGoogleSheets(payload: UpdatePayload) {
  const response = await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Sheets sync failed: ${response.statusText}`);
  }
}

async function logFailedSync(payload: UpdatePayload, error: string) {
  await supabase.from('sync_failures').insert({
    unique_id: payload.uniqueId,
    field: payload.field,
    value: payload.value,
    error_message: error,
    created_at: new Date().toISOString()
  });
}
