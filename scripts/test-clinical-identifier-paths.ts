// Test 4: Confirm fetch-by-id and fetch-by-kobo-uuid return identical clinical data
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

async function fetchPatient(identifier: string) {
  const url = new URL(`http://localhost/api/patient-sync?patientId=${identifier}`);
  const req = new NextRequest(url.toString());
  const res = await GET(req);
  return res.json();
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 TEST 4: IDENTIFIER PATH CONSISTENCY (id vs kobo_uuid)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const dbRow = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tmp', 'clinical-db-row.json'), 'utf-8'));
  const { patient_id, kobo_uuid, inmate_name } = dbRow;

  console.log(`Patient: ${inmate_name}`);
  console.log(`   id:        ${patient_id}`);
  console.log(`   kobo_uuid: ${kobo_uuid}\n`);

  // Fetch by both identifiers
  console.log('📡 Fetching by id...');
  const byId = await fetchPatient(patient_id);
  console.log(`   Status: ${byId.success ? '✅ OK' : '❌ FAILED'} — patient returned: ${!!byId.patient}\n`);

  console.log('📡 Fetching by kobo_uuid...');
  const byUuid = kobo_uuid ? await fetchPatient(kobo_uuid) : { success: false, patient: null };
  console.log(`   Status: ${byUuid.success ? '✅ OK' : '❌ FAILED'} — patient returned: ${!!byUuid.patient}\n`);

  // Compare clinical fields between both fetch paths
  console.log('🔬 CLINICAL FIELD COMPARISON (fetch-by-id vs fetch-by-uuid):\n');
  console.log('Field                        | By ID                 | By UUID               | Match');
  console.log('─'.repeat(90));

  const comparison: Record<string, any> = {};
  let mismatches = 0;

  CLINICAL_FIELDS.forEach(field => {
    const byIdVal = byId.patient?.[field];
    const byUuidVal = byUuid.patient?.[field];
    const matches = String(byIdVal ?? '') === String(byUuidVal ?? '');
    if (!matches) mismatches++;

    comparison[field] = { by_id: byIdVal, by_uuid: byUuidVal, matches };

    const icon = matches ? '✅' : '❌';
    const idDisplay = String(byIdVal ?? '(null)').substring(0, 20).padEnd(21);
    const uuidDisplay = String(byUuidVal ?? '(null)').substring(0, 20).padEnd(21);
    console.log(`${icon} ${field.padEnd(28)} | ${idDisplay} | ${uuidDisplay} | ${matches ? 'MATCH' : 'MISMATCH ⚠️'}`);
  });

  console.log(`\n📈 Summary:`);
  console.log(`   ✅ Matching:   ${CLINICAL_FIELDS.length - mismatches}/${CLINICAL_FIELDS.length}`);
  console.log(`   ❌ Mismatches: ${mismatches}`);

  // Key diagnostic: does the drawer fetch by id or kobo_uuid?
  console.log('\n🔑 IDENTIFIER USED BY DRAWER:');
  console.log('   Drawer open fetch: patient?.id  → /api/patient-sync?patientId=<id>');
  console.log('   Drawer save:       localPatient.kobo_uuid || localPatient.id');
  console.log('   ⚠️  MISMATCH: fetch uses .id, save uses .kobo_uuid first');
  console.log('   If kobo_uuid resolves to a different row → save goes to different record than fetch');

  const output = {
    patient_id, kobo_uuid,
    fetch_by_id: { success: byId.success, has_patient: !!byId.patient },
    fetch_by_uuid: { success: byUuid.success, has_patient: !!byUuid.patient },
    field_comparison: comparison,
    summary: { total: CLINICAL_FIELDS.length, matching: CLINICAL_FIELDS.length - mismatches, mismatches },
    diagnosis: {
      drawer_fetch_uses: 'patient.id',
      drawer_save_uses: 'localPatient.kobo_uuid || localPatient.id',
      identifier_mismatch_risk: mismatches > 0 ? 'HIGH' : 'LOW'
    }
  };

  const outPath = path.join(process.cwd(), 'tmp', 'clinical-identifier-paths.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved to: ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
