import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { appendPatientToSheets, updatePatientInSheets } from '@/lib/sheetsSync';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // Auth check
  const secret = request.headers.get('x-admin-secret');
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find stuck records
  const { data: stuckPatients } = await adminSupabase
    .from('patients')
    .select('*')
    .eq('synced_to_sheets', false)
    .gte('sheets_sync_attempts', 1)
    .order('sheets_sync_attempts', { ascending: true })
    .limit(100);

  if (!stuckPatients?.length) {
    return NextResponse.json({
      message: 'No stuck records found',
      total: 0, retried: 0, fixed: 0
    });
  }

  let fixed = 0;
  let stillFailing = 0;
  const errors: string[] = [];

  for (const patient of stuckPatients) {
    try {
      const result = await updatePatientInSheets(patient);
      if (result.success) {
        await adminSupabase
          .from('patients')
          .update({
            synced_to_sheets: true,
            sheets_synced_at: new Date().toISOString(),
            sheets_sync_error: null
          })
          .eq('id', patient.id);
        fixed++;
      } else {
        await adminSupabase
          .from('patients')
          .update({
            sheets_sync_attempts: (patient.sheets_sync_attempts ?? 0) + 1,
            sheets_sync_error: result.error
          })
          .eq('id', patient.id);
        stillFailing++;
        errors.push(`${patient.unique_id}: ${result.error}`);
      }
    } catch (err: any) {
      stillFailing++;
      errors.push(`${patient.unique_id}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  return NextResponse.json({
    total: stuckPatients.length,
    fixed,
    stillFailing,
    errors: errors.slice(0, 10)
  });
}
