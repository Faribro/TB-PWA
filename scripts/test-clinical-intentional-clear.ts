/**
 * scripts/test-clinical-intentional-clear.ts
 *
 * Verifies that clearing a populated field in the clinical form correctly translates
 * to an 'intentional_clear' status in the diff payload, maps to null/empty in the
 * database mapper, and persists correctly in the DB.
 *
 * Run: bun run scripts/test-clinical-intentional-clear.ts
 */

import { mapPatientUpdatesToDb } from '../lib/db/patientUpdateFields';
import { sanitizePatientUpdate } from '../lib/db/sanitizePatientUpdate';
import { CLINICAL_FORM_FIELD_TO_COLUMN } from '../lib/db/clinicalFields';
import { buildClinicalDiffPayload } from '../lib/db/buildClinicalDiffPayload';
import { getSupabaseClient } from '../lib/supabase-server';
import fs from 'fs';
import path from 'path';

const CLINICAL_FIELDS = [
  'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
  'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status',
  'art_status', 'art_number', 'nikshay_abha_id', 'registration_date',
  'remarks', 'other_facility_name'
];

function formatDate(val: any): string {
  if (!val) return '';
  const date = new Date(val);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 TEST: CLINICAL INTENTIONAL CLEAR ROUND-TRIP');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const supabase = getSupabaseClient();
  const dbRow = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tmp', 'clinical-db-row.json'), 'utf-8'));
  const patientId = dbRow.patient_id;
  const koboUuid = dbRow.kobo_uuid;

  console.log(`Patient: ${dbRow.inmate_name} (ID: ${patientId})`);

  // 1. Fetch current DB state (so we can restore it later)
  const { data: original, error: fetchError } = await supabase
    .from('patients')
    .select(CLINICAL_FIELDS.join(','))
    .eq('id', patientId)
    .maybeSingle();

  if (fetchError || !original) {
    console.error('❌ Failed to fetch patient before test:', fetchError);
    process.exit(1);
  }

  // 2. Setup: Ensure database has values we can clear
  // We'll write specific test values for att_completion_date (date) and other_facility_name (text)
  const setupValues = {
    att_completion_date: '2024-12-31',
    other_facility_name: 'Clear Me microscopy'
  };
  
  console.log('🛠️ Setup: Pre-populating fields in DB for testing clears...');
  const { error: setupError } = await supabase
    .from('patients')
    .update(setupValues)
    .eq('id', patientId);

  if (setupError) {
    console.error('❌ Setup failed:', setupError);
    process.exit(1);
  }
  console.log('✅ Setup completed.');

  // Fetch fresh state reflecting setup values
  const { data: before } = await supabase
    .from('patients')
    .select(CLINICAL_FIELDS.join(','))
    .eq('id', patientId)
    .maybeSingle();

  // 3. Simulate form where user clears att_completion_date and other_facility_name
  console.log('\n✏️ Simulating form submission with clears (empty strings):');
  console.log('   - Date of Treatment Completion → ""');
  console.log('   - Other Facility Name → ""');

  const formData: Record<string, string> = {
    'Date of referral for TB Examination (sputum) (dd/mm/yy)': formatDate((before as any).referral_date),
    'Name of facility where referred to (Give code/name of all facilities)': (before as any).referred_facility || '',
    'TB diagnosed (Y/N)': (before as any).tb_diagnosed || '',
    'Date of TB Diagnosed (dd/mm/yy)': formatDate((before as any).tb_diagnosis_date),
    'Type of TB Diagnosed (P/EP)': (before as any).tb_type || '',
    'Date of starting ATT (dd/mm/yyyy)': formatDate((before as any).att_start_date),
    'Date of Treatment Completion (dd/mm/yyyy)': '', // CLEARED
    'HIV Status (Positive/Negative/Unknown)': (before as any).hiv_status || '',
    'Status at the time of referral (Pre ART/On ART)': (before as any).art_status || '',
    'ART Number (if on ART at the time of referral)': (before as any).art_number || '',
    'NIKSHAY/ABHA ID': (before as any).nikshay_abha_id || '',
    'Date of registration (dd/mm/yyyy)': formatDate((before as any).registration_date),
    'Remarks': (before as any).remarks || '',
    'Other Facility Name': '' // CLEARED
  };

  // 4. Build diff payload
  const { payload, diffResults } = buildClinicalDiffPayload({
    formData,
    fetchedPatient: before
  });

  console.log('\n📦 Diff Builder Results for Cleared Fields:');
  const targetDiffs = diffResults.filter(r => r.dbColumn === 'att_completion_date' || r.dbColumn === 'other_facility_name');
  targetDiffs.forEach(r => {
    console.log(`   - [${r.status.toUpperCase()}] ${r.dbColumn.padEnd(20)} | Form: "${r.formValue}" | DB: "${r.dbValue}" | Included: ${r.included}`);
  });

  // Verify that the helper flagged both as intentional clears
  const clears = targetDiffs.filter(r => r.status === 'intentional_clear');
  if (clears.length !== 2) {
    console.error('❌ TEST FAILED: Both target fields should have been flagged as intentional_clear.');
    process.exit(1);
  }
  console.log('✅ Diff builder flagged cleared fields correctly.');

  // 5. Submit update to database
  console.log('\n💾 Saving clears to DB...');
  const sanitized = sanitizePatientUpdate(payload);
  const mapped = mapPatientUpdatesToDb(sanitized);

  const { error: updateError } = await supabase
    .from('patients')
    .update(mapped.dbUpdates)
    .eq('id', patientId);

  if (updateError) {
    console.error('❌ Update failed:', updateError);
    process.exit(1);
  }
  console.log('✅ Updates saved successfully.');

  // 6. Verify database records reflect the clears:
  // - Date fields should become NULL.
  // - Text fields should become empty string '' (or null depending on mapper details, but let's assert what the mapper produces).
  // Let's re-read patient
  const { data: after } = await supabase
    .from('patients')
    .select(CLINICAL_FIELDS.join(','))
    .eq('id', patientId)
    .maybeSingle();

  console.log('\n🔍 Verifying database columns:');
  let failures = 0;

  const clearedDate = (after as any).att_completion_date;
  if (clearedDate !== null) {
    console.error(`   ❌ att_completion_date was NOT set to NULL. Value is:`, clearedDate);
    failures++;
  } else {
    console.log(`   ✅ att_completion_date successfully set to NULL in DB.`);
  }

  const clearedText = (after as any).other_facility_name;
  // According to normalizeDbValue: value === '' maps to '' for non-date/number fields
  if (clearedText !== '') {
    console.error(`   ❌ other_facility_name was NOT set to ''. Value is: "${clearedText}"`);
    failures++;
  } else {
    console.log(`   ✅ other_facility_name successfully set to empty string in DB.`);
  }

  // 7. Clean up: Restore original state
  console.log('\n🔄 Restoring original patient record...');
  const restorePayload: Record<string, any> = { updated_at: new Date().toISOString() };
  CLINICAL_FIELDS.forEach(f => {
    restorePayload[f] = (original as any)[f] ?? null;
  });

  const { error: restoreError } = await supabase
    .from('patients')
    .update(restorePayload)
    .eq('id', patientId);

  if (restoreError) {
    console.error('❌ Failed to restore original record:', restoreError);
  } else {
    console.log('✅ Database state restored successfully.');
  }

  if (failures > 0) {
    console.error(`\n❌ TEST FAILED: Verification errors detected.`);
    process.exit(1);
  } else {
    console.log('\n🎉 TEST PASSED: Intentional clears successfully write null/empty to correct database columns.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
