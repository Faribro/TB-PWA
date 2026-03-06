'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import type { PatientFormData } from './schemas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function updatePatientAction(uniqueId: string, updates: PatientFormData) {
  try {
    // 1. SYNC: Update Supabase immediately
    const dbUpdates: Record<string, any> = {};
    
    if (updates['Date of referral for TB Examination (sputum) (dd/mm/yy)']) {
      dbUpdates.referral_date = updates['Date of referral for TB Examination (sputum) (dd/mm/yy)'];
    }
    if (updates['Name of facility where referred to (Give code/name of all facilities)']) {
      dbUpdates.referral_facility = updates['Name of facility where referred to (Give code/name of all facilities)'];
    }
    if (updates['TB diagnosed (Y/N)']) {
      dbUpdates.tb_diagnosed = updates['TB diagnosed (Y/N)'];
    }
    if (updates['Date of TB Diagnosed (dd/mm/yy)']) {
      dbUpdates.diagnosis_date = updates['Date of TB Diagnosed (dd/mm/yy)'];
    }
    if (updates['Type of TB Diagnosed (P/EP)']) {
      dbUpdates.tb_type = updates['Type of TB Diagnosed (P/EP)'];
    }
    if (updates['Date of starting ATT (dd/mm/yyyy)']) {
      dbUpdates.att_start_date = updates['Date of starting ATT (dd/mm/yyyy)'];
    }
    if (updates['Date of Treatment Completion (dd/mm/yyyy)']) {
      dbUpdates.att_completion_date = updates['Date of Treatment Completion (dd/mm/yyyy)'];
    }
    if (updates['HIV Status (Positive/Negative/Unknown)']) {
      dbUpdates.hiv_status = updates['HIV Status (Positive/Negative/Unknown)'];
    }
    if (updates['Status at the time of referral (Pre ART/On ART)']) {
      dbUpdates.art_status = updates['Status at the time of referral (Pre ART/On ART)'];
    }
    if (updates['ART Number']) {
      dbUpdates.art_number = updates['ART Number'];
    }
    if (updates['NIKSHAY/ABHA ID']) {
      dbUpdates.nikshay_id = updates['NIKSHAY/ABHA ID'];
    }
    if (updates['Date of registration (dd/mm/yyyy)']) {
      dbUpdates.registration_date = updates['Date of registration (dd/mm/yyyy)'];
    }
    if (updates['Remarks']) {
      dbUpdates.remarks = updates['Remarks'];
    }
    if (updates['closure_reason']) {
      dbUpdates.closure_reason = updates['closure_reason'];
    }

    const { error } = await supabase
      .from('patients')
      .update(dbUpdates)
      .eq('unique_id', uniqueId);

    if (error) throw error;

    // 2. ASYNC: Trigger Google Sheets sync (non-blocking)
    syncToGoogleSheets(uniqueId, updates).catch(err => {
      console.error('Google Sheets sync failed:', err);
      logFailedSync(uniqueId, updates, err.message);
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Update failed:', error);
    return { success: false, error: error.message };
  }
}

async function syncToGoogleSheets(uniqueId: string, updates: PatientFormData) {
  const payload = {
    uniqueId,
    updates
  };

  const response = await fetch(process.env.GOOGLE_APPSCRIPT_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Sheets sync failed: ${response.statusText}`);
  }
}

async function logFailedSync(uniqueId: string, updates: PatientFormData, error: string) {
  await supabase.from('sync_failures').insert({
    unique_id: uniqueId,
    updates: JSON.stringify(updates),
    error_message: error,
    created_at: new Date().toISOString()
  });
}
