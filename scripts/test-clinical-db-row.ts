// Test 1: Fetch patient with most clinical data from DB
import { getSupabaseClient } from '../lib/supabase-server';
import fs from 'fs';
import path from 'path';

const CLINICAL_FIELDS = [
  'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
  'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status',
  'art_status', 'art_number', 'nikshay_abha_id', 'registration_date',
  'remarks', 'other_facility_name'
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 TEST 1: CLINICAL DATA IN DATABASE');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const supabase = getSupabaseClient();

  // Fetch all recent patients and pick the one with most clinical fields
  const { data: patients, error } = await supabase
    .from('patients')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error || !patients?.length) {
    console.error('❌ Error fetching patients:', error);
    process.exit(1);
  }

  // Score each patient by how many clinical fields are populated
  const scored = patients.map(p => ({
    patient: p,
    score: CLINICAL_FIELDS.filter(f => p[f] !== null && p[f] !== undefined && p[f] !== '').length
  }));
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const patient = best.patient;

  console.log(`✅ Best patient found: ${patient.inmate_name}`);
  console.log(`   ID:        ${patient.id}`);
  console.log(`   Kobo UUID: ${patient.kobo_uuid}`);
  console.log(`   Updated:   ${patient.updated_at}`);
  console.log(`   Clinical fields populated: ${best.score}/${CLINICAL_FIELDS.length}\n`);

  console.log('📊 CLINICAL FIELDS IN DATABASE:\n');
  const clinicalData: Record<string, any> = {};
  CLINICAL_FIELDS.forEach(field => {
    const value = patient[field];
    const has = value !== null && value !== undefined && value !== '';
    clinicalData[field] = value;
    console.log(`${has ? '✅' : '❌'} ${field.padEnd(28)} = ${has ? value : '(null)'}`);
  });

  const output = {
    patient_id: patient.id,
    kobo_uuid: patient.kobo_uuid,
    inmate_name: patient.inmate_name,
    updated_at: patient.updated_at,
    clinical_fields: clinicalData,
    populated_count: best.score,
    total_fields: CLINICAL_FIELDS.length
  };

  const outPath = path.join(process.cwd(), 'tmp', 'clinical-db-row.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved to: ${outPath}`);

  if (best.score === 0) {
    console.log('\n⚠️  WARNING: No patient has any clinical data in DB.');
    console.log('   Save clinical data via the drawer first, then re-run.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
