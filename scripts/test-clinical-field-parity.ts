// Test 3: Trace DB → API → form reset values — find exact layer where data is lost
import fs from 'fs';
import path from 'path';

const FORM_FIELD_TO_DB: Record<string, string> = {
  'Date of referral for TB Examination (sputum) (dd/mm/yy)': 'referral_date',
  'Name of facility where referred to (Give code/name of all facilities)': 'referred_facility',
  'TB diagnosed (Y/N)': 'tb_diagnosed',
  'Date of TB Diagnosed (dd/mm/yy)': 'tb_diagnosis_date',
  'Type of TB Diagnosed (P/EP)': 'tb_type',
  'Date of starting ATT (dd/mm/yyyy)': 'att_start_date',
  'Date of Treatment Completion (dd/mm/yyyy)': 'att_completion_date',
  'HIV Status (Positive/Negative/Unknown)': 'hiv_status',
  'Status at the time of referral (Pre ART/On ART)': 'art_status',
  'ART Number (if on ART at the time of referral)': 'art_number',
  'NIKSHAY/ABHA ID': 'nikshay_abha_id',
  'Date of registration (dd/mm/yyyy)': 'registration_date',
  'Remarks': 'remarks',
  'Other Facility Name': 'other_facility_name'
};

// Mirrors the exact formatDateForInput logic in PatientDetailDrawer
function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const parts = dateStr.split('-');
      if (date.getFullYear() !== parseInt(parts[0]) ||
          (date.getMonth() + 1) !== parseInt(parts[1]) ||
          date.getDate() !== parseInt(parts[2])) return '';
      return dateStr;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch { return ''; }
}

const DATE_FORM_KEYS = new Set([
  'Date of referral for TB Examination (sputum) (dd/mm/yy)',
  'Date of TB Diagnosed (dd/mm/yy)',
  'Date of starting ATT (dd/mm/yyyy)',
  'Date of Treatment Completion (dd/mm/yyyy)',
  'Date of registration (dd/mm/yyyy)'
]);

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 TEST 3: FIELD PARITY — DB → API → FORM RESET');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const dbRow = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tmp', 'clinical-db-row.json'), 'utf-8'));
  const apiResult = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tmp', 'clinical-api-prefill.json'), 'utf-8'));

  const apiPatient = apiResult.api_patient;

  console.log('Layer 1 → Layer 2 → Layer 3\n');
  console.log('DB Column                    | DB Value              | API Value             | Form Reset Value      | Lost At');
  console.log('─'.repeat(110));

  const report: Record<string, any> = {};
  let lostAtDb = 0, lostAtApi = 0, lostAtForm = 0, ok = 0;

  Object.entries(FORM_FIELD_TO_DB).forEach(([formKey, dbCol]) => {
    const dbVal = dbRow.clinical_fields[dbCol];
    const apiVal = apiPatient[dbCol];

    // Simulate exact form reset logic from PatientDetailDrawer
    const formVal = DATE_FORM_KEYS.has(formKey)
      ? formatDateForInput(apiVal)
      : (apiVal || '');

    const dbHas = dbVal !== null && dbVal !== undefined && dbVal !== '';
    const apiHas = apiVal !== null && apiVal !== undefined && apiVal !== '';
    const formHas = formVal !== '';

    let lostAt = 'ok';
    if (dbHas && !apiHas) { lostAt = 'DB→API'; lostAtDb++; }
    else if (dbHas && apiHas && !formHas) { lostAt = 'API→FORM'; lostAtApi++; }
    else if (!dbHas) { lostAt = 'not_in_db'; }
    else { ok++; }

    const icon = lostAt === 'ok' ? '✅' : lostAt === 'not_in_db' ? '⬜' : '❌';
    const dbDisplay = String(dbVal ?? '').substring(0, 20).padEnd(21);
    const apiDisplay = String(apiVal ?? '').substring(0, 20).padEnd(21);
    const formDisplay = String(formVal ?? '').substring(0, 20).padEnd(21);

    console.log(`${icon} ${dbCol.padEnd(28)} | ${dbDisplay} | ${apiDisplay} | ${formDisplay} | ${lostAt}`);

    report[formKey] = { db_column: dbCol, db_value: dbVal, api_value: apiVal, form_reset_value: formVal, lost_at: lostAt };
  });

  console.log('\n📊 SUMMARY:\n');
  console.log(`   ✅ Flows correctly to form: ${ok}`);
  console.log(`   ❌ Lost at DB → API:        ${lostAtDb}`);
  console.log(`   ❌ Lost at API → Form:      ${lostAtApi}`);
  console.log(`   ⬜ Not in DB (expected):    ${Object.keys(FORM_FIELD_TO_DB).length - ok - lostAtDb - lostAtApi}`);

  if (lostAtDb > 0) {
    console.log('\n🔴 ROOT CAUSE: Fields exist in DB but are NOT returned by /api/patient-sync');
  }
  if (lostAtApi > 0) {
    console.log('\n🔴 ROOT CAUSE: Fields returned by API but lost during form reset (formatDateForInput or || empty)');
  }
  if (lostAtDb === 0 && lostAtApi === 0 && ok === 0) {
    console.log('\n⚠️  No clinical data in DB to trace. Save data via drawer first.');
  }

  const outPath = path.join(process.cwd(), 'tmp', 'clinical-field-parity.json');
  fs.writeFileSync(outPath, JSON.stringify({ report, summary: { ok, lostAtDb, lostAtApi } }, null, 2));
  console.log(`\n✅ Saved to: ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
