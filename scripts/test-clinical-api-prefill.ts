// Test 2: Call /api/patient-sync (same path as drawer open) and compare with DB row
import { getSupabaseClient } from '../lib/supabase-server';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { GET } from '../app/api/patient-sync/route';

const CLINICAL_FIELDS = [
  'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
  'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status',
  'art_status', 'art_number', 'nikshay_abha_id', 'registration_date',
  'remarks', 'other_facility_name'
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 TEST 2: API PREFILL ENDPOINT (/api/patient-sync GET)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Load DB row from test 1
  const dbRowPath = path.join(process.cwd(), 'tmp', 'clinical-db-row.json');
  if (!fs.existsSync(dbRowPath)) {
    console.error('❌ Run test 1 first: bun run test:clinical-db');
    process.exit(1);
  }
  const dbRow = JSON.parse(fs.readFileSync(dbRowPath, 'utf-8'));
  const patientId = dbRow.patient_id;
  const koboUuid = dbRow.kobo_uuid;

  console.log(`📋 Testing with patient: ${dbRow.inmate_name}`);
  console.log(`   ID: ${patientId}`);
  console.log(`   Kobo UUID: ${koboUuid}\n`);

  // Call the exact same endpoint the drawer uses on open
  const url = new URL(`http://localhost/api/patient-sync?patientId=${patientId}`);
  const req = new NextRequest(url.toString());
  const res = await GET(req);
  const apiData = await res.json();

  if (!apiData.patient) {
    console.error('❌ API returned no patient:', apiData);
    process.exit(1);
  }

  const apiPatient = apiData.patient;
  console.log(`✅ API returned patient: ${apiPatient.inmate_name}\n`);

  console.log('📊 FIELD-BY-FIELD COMPARISON (DB vs API):\n');

  const comparison: Record<string, any> = {};
  let matchCount = 0;
  let missingInApi = 0;
  let mismatchCount = 0;

  CLINICAL_FIELDS.forEach(field => {
    const dbVal = dbRow.clinical_fields[field];
    const apiVal = apiPatient[field];
    const dbHas = dbVal !== null && dbVal !== undefined && dbVal !== '';
    const apiHas = apiVal !== null && apiVal !== undefined && apiVal !== '';
    const matches = String(dbVal) === String(apiVal);

    if (matches) matchCount++;
    else if (dbHas && !apiHas) missingInApi++;
    else if (dbHas && apiHas && !matches) mismatchCount++;

    comparison[field] = { db: dbVal, api: apiVal, db_has: dbHas, api_has: apiHas, matches };

    const icon = matches ? '✅' : (dbHas && !apiHas ? '❌ MISSING' : '⚠️  DIFF');
    console.log(`${icon} ${field.padEnd(28)}`);
    if (!matches && (dbHas || apiHas)) {
      console.log(`     DB:  ${dbVal ?? '(null)'}`);
      console.log(`     API: ${apiVal ?? '(null)'}`);
    }
  });

  console.log(`\n📈 Summary:`);
  console.log(`   ✅ Matching:        ${matchCount}/${CLINICAL_FIELDS.length}`);
  console.log(`   ❌ Missing in API:  ${missingInApi}`);
  console.log(`   ⚠️  Value mismatch: ${mismatchCount}`);

  const output = {
    patient_id: patientId,
    kobo_uuid: koboUuid,
    api_patient: apiPatient,
    comparison,
    summary: { matchCount, missingInApi, mismatchCount, total: CLINICAL_FIELDS.length }
  };

  const outPath = path.join(process.cwd(), 'tmp', 'clinical-api-prefill.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved to: ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
