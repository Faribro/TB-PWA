// Test 5: Simulate exact handleSaveClinical payload and verify it lands in DB
import { getSupabaseClient } from '../lib/supabase-server';
import { mapPatientUpdatesToDb } from '../lib/db/patientUpdateFields';
import { sanitizePatientUpdate } from '../lib/db/sanitizePatientUpdate';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 TEST 5: SIMULATE handleSaveClinical PAYLOAD → DB');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const dbRow = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tmp', 'clinical-db-row.json'), 'utf-8'));
  const patientId = dbRow.patient_id;
  const koboUuid = dbRow.kobo_uuid;

  console.log(`Patient: ${dbRow.inmate_name}`);
  console.log(`   id:        ${patientId}`);
  console.log(`   kobo_uuid: ${koboUuid}\n`);

  // Simulate exactly what handleSaveClinical builds
  const simulatedFormData: Record<string, string> = {
    'Date of referral for TB Examination (sputum) (dd/mm/yy)': '2024-03-15',
    'Name of facility where referred to (Give code/name of all facilities)': 'DMC-Designated microscopy centre',
    'TB diagnosed (Y/N)': 'Y',
    'Date of TB Diagnosed (dd/mm/yy)': '2024-03-20',
    'Type of TB Diagnosed (P/EP)': 'Pulmonary',
    'Date of starting ATT (dd/mm/yyyy)': '2024-04-01',
    'Date of Treatment Completion (dd/mm/yyyy)': '2024-10-01',
    'HIV Status (Positive/Negative/Unknown)': 'Negative',
    'Status at the time of referral (Pre ART/On ART)': 'Pre ART',
    'ART Number (if on ART at the time of referral)': 'ART-TEST-001',
    'NIKSHAY/ABHA ID': 'NIKSHAY-TEST-001',
    'Date of registration (dd/mm/yyyy)': '2024-04-05',
    'Remarks': 'Test save from diagnostic script',
    'Other Facility Name': ''
  };

  // Exact payload structure from handleSaveClinical
  const { CLINICAL_FORM_FIELD_TO_COLUMN } = await import('../lib/db/clinicalFields');
  const payload: Record<string, any> = {
    id: koboUuid || patientId,  // ← exactly as in drawer
    updated_at: new Date().toISOString()
  };

  for (const [formKey, dbColumn] of Object.entries(CLINICAL_FORM_FIELD_TO_COLUMN)) {
    if (Object.prototype.hasOwnProperty.call(simulatedFormData, formKey)) {
      payload[dbColumn] = simulatedFormData[formKey] ?? '';
    }
  }

  console.log('📤 PAYLOAD being sent to /api/patient-sync:\n');
  console.log(JSON.stringify(payload, null, 2));

  // Run through the exact same mapper the API uses
  console.log('\n🔄 Running through sanitizePatientUpdate + mapPatientUpdatesToDb...\n');
  const sanitized = sanitizePatientUpdate(payload);
  const mapped = mapPatientUpdatesToDb(sanitized);

  console.log('📊 MAPPING RESULTS:\n');
  console.log(`   ✅ Mapped to DB columns: ${Object.keys(mapped.dbUpdates).length}`);
  console.log(`   ❌ Unmapped keys:        ${mapped.unmappedKeys.length}`);
  console.log(`   ⚠️  Ignored (metadata):  ${mapped.events.filter(e => e.reason === 'ignored_metadata').length}`);
  console.log(`   ⚠️  Collisions:          ${mapped.collisions.length}`);

  console.log('\n📋 DB COLUMNS that will be written:\n');
  Object.entries(mapped.dbUpdates).forEach(([col, val]) => {
    console.log(`   ✅ ${col.padEnd(28)} = ${val}`);
  });

  if (mapped.unmappedKeys.length > 0) {
    console.log('\n❌ UNMAPPED KEYS (will NOT be written to DB):\n');
    mapped.unmappedKeys.forEach(k => console.log(`   ❌ ${k}`));
  }

  const ignoredKeys = mapped.events.filter(e => e.reason === 'ignored_metadata').map(e => e.inputKey);
  if (ignoredKeys.length > 0) {
    console.log('\n⚠️  IGNORED METADATA KEYS:\n');
    ignoredKeys.forEach(k => console.log(`   ⚠️  ${k}`));
  }

  // Now actually write to DB and verify
  console.log('\n💾 Writing to DB...\n');
  const supabase = getSupabaseClient();

  mapped.dbUpdates.updated_at = new Date().toISOString();

  const { data: updateResult, error: updateError } = await supabase
    .from('patients')
    .update(mapped.dbUpdates)
    .eq('id', patientId)
    .select('id, updated_at')
    .maybeSingle();

  if (updateError) {
    console.error('❌ DB UPDATE FAILED:', updateError);
    process.exit(1);
  }

  console.log(`✅ DB update succeeded: ${JSON.stringify(updateResult)}`);

  // Re-read from DB to confirm
  console.log('\n🔍 Re-reading from DB to confirm...\n');
  const { data: reread, error: rereadError } = await supabase
    .from('patients')
    .select('referral_date, referred_facility, tb_diagnosed, tb_diagnosis_date, tb_type, att_start_date, hiv_status, nikshay_abha_id, remarks')
    .eq('id', patientId)
    .maybeSingle();

  if (rereadError || !reread) {
    console.error('❌ Re-read failed:', rereadError);
    process.exit(1);
  }

  console.log('📊 CONFIRMED IN DB:\n');
  Object.entries(reread).forEach(([col, val]) => {
    const has = val !== null && val !== undefined && val !== '';
    console.log(`${has ? '✅' : '❌'} ${col.padEnd(28)} = ${val ?? '(null)'}`);
  });

  // Save results
  const output = {
    patient_id: patientId,
    payload_sent: payload,
    mapped_db_columns: mapped.dbUpdates,
    unmapped_keys: mapped.unmappedKeys,
    ignored_keys: ignoredKeys,
    db_confirmed: reread
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'tmp', 'clinical-save-test.json'),
    JSON.stringify(output, null, 2)
  );

  console.log('\n✅ Saved to: tmp/clinical-save-test.json');
}

main().catch(e => { console.error(e); process.exit(1); });
