/**
 * scripts/test-clinical-diff-save.ts
 *
 * Verifies that buildClinicalDiffPayload correctly identifies changed fields,
 * omits unchanged fields, and that saving a partial diff preserves all untouched
 * populated fields in the database.
 *
 * Run: bun run scripts/test-clinical-diff-save.ts
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

// Helper to format dates to YYYY-MM-DD
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
  console.log('🔍 TEST: CLINICAL PARTIAL DIFF SAVE (NON-DESTRUCTIVE)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const supabase = getSupabaseClient();
  const dbRow = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tmp', 'clinical-db-row.json'), 'utf-8'));
  const patientId = dbRow.patient_id;
  const koboUuid = dbRow.kobo_uuid;

  console.log(`Patient: ${dbRow.inmate_name} (ID: ${patientId})`);

  // 1. Fetch current DB state
  const { data: before, error: fetchError } = await supabase
    .from('patients')
    .select(CLINICAL_FIELDS.join(','))
    .eq('id', patientId)
    .maybeSingle();

  if (fetchError || !before) {
    console.error('❌ Failed to fetch patient before test:', fetchError);
    process.exit(1);
  }

  // 2. Prepare Form Data: representing the DB values (untouched) plus ONE modified field
  // We'll change only 'remarks' to a unique test string.
  const testRemarks = `Diff Save Test - ${new Date().toISOString()}`;
  console.log(`\n✏️ Simulating form edits:`);
  console.log(`   - Remarks changed to: "${testRemarks}"`);
  console.log(`   - All other fields remain untouched (matching DB values)`);

  const formData: Record<string, string> = {
    'Date of referral for TB Examination (sputum) (dd/mm/yy)': formatDate((before as any).referral_date),
    'Name of facility where referred to (Give code/name of all facilities)': (before as any).referred_facility || '',
    'TB diagnosed (Y/N)': (before as any).tb_diagnosed || '',
    'Date of TB Diagnosed (dd/mm/yy)': formatDate((before as any).tb_diagnosis_date),
    'Type of TB Diagnosed (P/EP)': (before as any).tb_type || '',
    'Date of starting ATT (dd/mm/yyyy)': formatDate((before as any).att_start_date),
    'Date of Treatment Completion (dd/mm/yyyy)': formatDate((before as any).att_completion_date),
    'HIV Status (Positive/Negative/Unknown)': (before as any).hiv_status || '',
    'Status at the time of referral (Pre ART/On ART)': (before as any).art_status || '',
    'ART Number (if on ART at the time of referral)': (before as any).art_number || '',
    'NIKSHAY/ABHA ID': (before as any).nikshay_abha_id || '',
    'Date of registration (dd/mm/yyyy)': formatDate((before as any).registration_date),
    'Remarks': testRemarks, // modified field
    'Other Facility Name': (before as any).other_facility_name || ''
  };

  // 3. Build clinical diff payload
  const { payload, diffResults } = buildClinicalDiffPayload({
    formData,
    fetchedPatient: before
  });

  console.log('\n📦 Diff Builder Results:');
  diffResults.forEach(r => {
    console.log(`   - [${r.status.toUpperCase()}] ${r.dbColumn.padEnd(20)} | Form: "${r.formValue}" | DB: "${r.dbValue}" | Included: ${r.included}`);
  });

  // Verify assertion: ONLY remarks and updated_at should be in the payload
  const payloadKeys = Object.keys(payload).filter(k => k !== 'updated_at');
  console.log(`\n🔑 Payload updates keys (excluding updated_at):`, payloadKeys);
  
  if (payloadKeys.length !== 1 || payloadKeys[0] !== 'remarks') {
    console.error(`❌ TEST FAILED: Payload should contain exactly ONE update field ('remarks'). Got:`, payloadKeys);
    process.exit(1);
  }
  console.log('✅ Payload validation passed: only edited field is included.');

  // 4. Save updates to DB
  console.log('\n💾 Saving updates to DB...');
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
  console.log('✅ Update successful.');

  // 5. Re-read and verify that untouched fields are unchanged and the modified field has updated
  const { data: after } = await supabase
    .from('patients')
    .select(CLINICAL_FIELDS.join(','))
    .eq('id', patientId)
    .maybeSingle();

  console.log('\n🔍 Verifying database integrity after partial update:');
  let failures = 0;
  CLINICAL_FIELDS.forEach(f => {
    const valBefore = (before as any)[f];
    const valAfter = (after as any)[f];

    if (f === 'remarks') {
      if (valAfter !== testRemarks) {
        console.error(`   ❌ remarks failed to update! Expected: "${testRemarks}", got: "${valAfter}"`);
        failures++;
      } else {
        console.log(`   ✅ remarks updated correctly to: "${valAfter}"`);
      }
    } else {
      // Normalizing date formats for comparison
      const beforeCompare = f.includes('date') ? formatDate(valBefore) : String(valBefore ?? '').trim();
      const afterCompare = f.includes('date') ? formatDate(valAfter) : String(valAfter ?? '').trim();
      
      if (beforeCompare !== afterCompare) {
        console.error(`   ❌ Field ${f} was mutated! Was: "${valBefore}", Now: "${valAfter}"`);
        failures++;
      } else {
        console.log(`   ✅ Field ${f} preserved intact: "${valAfter}"`);
      }
    }
  });

  // 6. Restore original database record
  console.log('\n🔄 Restoring original patient record...');
  const restorePayload: Record<string, any> = { updated_at: new Date().toISOString() };
  CLINICAL_FIELDS.forEach(f => {
    restorePayload[f] = (before as any)[f] ?? null;
  });

  const { error: restoreError } = await supabase
    .from('patients')
    .update(restorePayload)
    .eq('id', patientId);

  if (restoreError) {
    console.error('❌ Failed to restore patient record:', restoreError);
  } else {
    console.log('✅ Database state restored successfully.');
  }

  if (failures > 0) {
    console.error(`\n❌ TEST FAILED: ${failures} verification errors detected.`);
    process.exit(1);
  } else {
    console.log('\n🎉 TEST PASSED: Partial saves are strictly non-destructive and preserve untouched columns.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
