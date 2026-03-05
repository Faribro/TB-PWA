'use server';

import { createServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function updatePatient(uuid: string, updates: Record<string, any>) {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('unique_id', uuid);
  
  try {
    await fetch(process.env.NEXT_PUBLIC_APPS_SCRIPT_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', uuid, data: updates })
    });
  } catch (e) {
    console.error('Apps Script sync failed:', e);
  }
  
  revalidatePath('/');
  return { success: true };
}

export async function syncPatients() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50000);
  return data || [];
}
