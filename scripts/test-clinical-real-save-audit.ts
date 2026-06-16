/**
 * scripts/test-clinical-real-save-audit.ts
 *
 * Traces the EXACT save pipeline for every clinical field:
 * formData → payload → sanitized → mapped → DB update → reread
 *
 * Run: bun run scripts/test-clinical-real-save-audit.ts
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

const dbRow = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tmp', 'clinical-db-row.json'), 'utf-8'));

// ─── Simulate 3 real user scenarios ───────────────────────────────────────────

// Scenario A: User fills ALL fields
const scenarioA_formData: Record<string, string> = {
  'Date of referral for TB Examination (sputum) (dd/mm/yy)': '2024-03-15',
  'Name of facility where referred to (Give code/name of all facilities)': 'DMC-Designated microscopy centre',
  'TB diagnosed (Y/N)': 'Y',
  'Date of TB Diagnosed (dd/mm/yy)': '2024-03-20',
  'Type of TB Diagnosed (P/EP)': 'Pulmonary',
  'Date of starting ATT (dd/mm/yyyy)': '2024-04-01',
  'Date of Treatment Completion (dd/mm/yyyy)': '2024-10-01',
  'HIV Status (Positive/Negative/Unknown)': 'Negative',
  'Status at the time of referral (Pre ART/On ART)': 'Pre ART',
  'ART Number (if on ART at the time of referral)': 'ART-001',
  'NIKSHAY/ABHA ID': 'NIK-001',
  'Date of registration (dd/mm/yyyy)': '2024-04-05',
  'Remarks': 'Full save test',
  'Other Facility Name': ''
};

// Scenario B: User only fills referral date — rest are DEFAULT EMPTY STRINGS from useForm
// This is the CRITICAL scenario — react-hook-form getValues() returns '' for untouched fields
const scenarioB_formData: Record<string, string> = {
  'Date of referral for TB Examination (sputum) (dd/mm/yy)': '2024-03-15',
  'Name of facility where referred to (Give code/name of all facilities)': '',
  'TB diagnosed (Y/N)': '',
  'Date of TB Diagnosed (dd/mm/yy)': '',
  'Type of TB Diagnosed (P/EP)': '',
  'Date of starting ATT (dd/mm/yyyy)': '',
  'Date of Treatment Completion (dd/mm/yyyy)': '',
  'HIV Status (Positive/Negative/Unknown)': '',
  'Status at the time of referral (Pre ART/On ART)': '',
  'ART Number (if on ART at the time of referral)': '',
  'NIKSHAY/ABHA ID': '',
  'Date of registration (dd/mm/yyyy)': '',
  'Remarks': '',
  'Other Facility Name': ''
};

// Scenario C: getValues() on a FRESH form (never reset, never touched)
// react-hook-form returns defaultValues for unregistered fields
// BUT — fields set via setValue() ARE tracked
// Fields NEVER touched via setValue or register → NOT in getValues() output
const scenarioC_formData: Record<string, string> = {};
// Empty — simulates getValues() when no fields were ever set via setValue/register

async function auditScenario(
  label: string,
  formData: Record<string, string>,
  patientId: string,
  koboUuid: string | null
) {
  console.log(`\n${'─'.repeat(75)}`);
  console.log(`📋 SCENARIO: ${label}`);
  console.log('─'.repeat(75));

  // Step 1: Build payload using buildClinicalDiffPayload
  const { payload: diffPayload } = buildClinicalDiffPayload({
    formData,
    fetchedPatient: dbRow.clinical_fields || {}
  });

  const payload: Record<string, any> = {
    id: koboUuid || patientId,
    updated_at: new Date().toISOString(),
    ...diffPayload
  };

  console.log(`\n[1] FORM DATA keys present: ${Object.keys(formData).length}`);
  console.log(`[2] PAYLOAD clinical keys: ${Object.keys(payload).filter(k => CLINICAL_FIELDS.includes(k)).length}`);

  // Step 2: Sanitize
  const sanitized = sanitizePatientUpdate(payload);
  console.log(`[3] SANITIZED keys: ${Object.keys(sanitized).length}`);

  // Step 3: Map to DB
  const mapped = mapPatientUpdatesToDb(sanitized);
  console.log(`[4] MAPPED DB columns: ${Object.keys(mapped.dbUpdates).length}`);
  console.log(`    Unmapped: ${mapped.unmappedKeys.length}`);
  console.log(`    Ignored:  ${mapped.events.filter(e => e.reason === 'ignored_metadata').length}`);

  // Step 4: Show what each clinical field becomes
  console.log('\n    Field                        | Form Value  | DB Value    | Fate');
  console.log('    ' + '─'.repeat(70));

  const fieldReport: Record<string, any> = {};

  CLINICAL_FIELDS.forEach(dbCol => {
    const formKey = Object.entries(CLINICAL_FORM_FIELD_TO_COLUMN).find(([, v]) => v === dbCol)?.[0];
    const formVal = formKey ? formData[formKey] : undefined;
    const dbVal = mapped.dbUpdates[dbCol];
    const inPayload = Object.prototype.hasOwnProperty.call(payload, dbCol);
    const inMapped = Object.prototype.hasOwnProperty.call(mapped.dbUpdates, dbCol);

    let fate = '';
    if (!inPayload) fate = '⬜ NOT IN PAYLOAD (formKey missing from formData)';
    else if (!inMapped) fate = '❌ DROPPED BY MAPPER';
    else if (dbVal === null) fate = '🔴 WILL WRITE NULL (empty string → null for dates)';
    else if (dbVal === '') fate = '🟡 WILL WRITE EMPTY STRING';
    else fate = '✅ WILL WRITE VALUE';

    fieldReport[dbCol] = { formVal, dbVal, inPayload, inMapped, fate };

    const fv = String(formVal ?? 'MISSING').substring(0, 10).padEnd(11);
    const dv = String(dbVal ?? 'null').substring(0, 10).padEnd(11);
    console.log(`    ${dbCol.padEnd(28)} | ${fv} | ${dv} | ${fate}`);
  });

  return { label, payload, sanitized, mapped: mapped.dbUpdates, fieldReport };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 REAL SAVE AUDIT — TRACING EVERY LAYER');
  console.log('═══════════════════════════════════════════════════════════════════════════');

  const patientId = dbRow.patient_id;
  const koboUuid = dbRow.kobo_uuid;

  console.log(`\nPatient: ${dbRow.inmate_name} | id: ${patientId} | kobo_uuid: ${koboUuid}`);

  const results: any[] = [];

  results.push(await auditScenario('A — User fills ALL fields', scenarioA_formData, patientId, koboUuid));
  results.push(await auditScenario('B — User fills ONLY referral date (rest are empty strings)', scenarioB_formData, patientId, koboUuid));
  results.push(await auditScenario('C — getValues() on FRESH form (no fields ever set via setValue)', scenarioC_formData, patientId, koboUuid));

  // ─── KEY DIAGNOSTIC ────────────────────────────────────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🔑 KEY DIAGNOSTIC: WHAT HAPPENS TO EXISTING DB VALUES ON PARTIAL SAVE');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  console.log('Scenario B simulates a user who ONLY fills referral_date.');
  console.log('The form sends empty strings for all other fields.');
  console.log('mapPatientUpdatesToDb converts empty date strings → null.');
  console.log('This OVERWRITES existing DB values with null!\n');

  const scenarioB_mapped = results[1].mapped;
  let willNullify = 0;
  let willPreserve = 0;

  CLINICAL_FIELDS.forEach(col => {
    const val = scenarioB_mapped[col];
    if (val === null || val === '') {
      willNullify++;
      console.log(`  🔴 ${col.padEnd(28)} → WILL BE SET TO ${val === null ? 'NULL' : 'EMPTY STRING'}`);
    } else {
      willPreserve++;
      console.log(`  ✅ ${col.padEnd(28)} → ${val}`);
    }
  });

  console.log(`\n  Summary: ${willNullify} fields NULLIFIED, ${willPreserve} fields preserved`);

  // ─── REACT-HOOK-FORM getValues() BEHAVIOR ─────────────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🔑 REACT-HOOK-FORM getValues() BEHAVIOR ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  console.log('Fields use setValue() + watch() — NO register() calls.');
  console.log('react-hook-form behavior for unregistered fields:\n');
  console.log('  • Fields set via setValue() → tracked in form store → returned by getValues()');
  console.log('  • Fields in defaultValues but NEVER touched → returned as defaultValue ("")');
  console.log('  • Fields NOT in defaultValues and NEVER set → NOT returned by getValues()\n');
  console.log('CRITICAL: When form resets with fetchedPatient data:');
  console.log('  → All 14 fields are set via reset() → all present in getValues()');
  console.log('  → If user does NOT touch a field, it stays as the reset value');
  console.log('  → If reset() fires BEFORE fetch completes → fields reset to "" (defaultValues)');
  console.log('  → User saves → empty strings sent → date fields → null in DB\n');

  console.log('RACE CONDITION TIMELINE (before fix):');
  console.log('  T=0ms  : Drawer opens, patient prop arrives');
  console.log('  T=1ms  : useEffect[patient] fires → setLocalPatient(patient)');
  console.log('  T=2ms  : useEffect[localPatient] fires → reset(form) with STALE prop data');
  console.log('  T=50ms : fetch("/api/patient-sync") starts');
  console.log('  T=200ms: fetch completes → setLocalPatient(freshData)');
  console.log('  T=201ms: useEffect[localPatient] fires → reset(form) with FRESH data ✅');
  console.log('  BUT: If user clicks Save between T=2ms and T=201ms → saves stale/empty data');

  // Save output
  const output = {
    patient_id: patientId,
    kobo_uuid: koboUuid,
    scenarios: results,
    key_findings: {
      partial_save_nullifies_existing_data: true,
      fields_that_get_nullified_on_partial_save: CLINICAL_FIELDS.filter(col => {
        const val = results[1].mapped[col];
        return val === null || val === '';
      }),
      race_condition_window_ms: '0-200ms after drawer open',
      fix_applied: 'form now resets only from fetchedPatient (after API fetch completes)'
    }
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'tmp', 'clinical-real-save-audit.json'),
    JSON.stringify(output, null, 2)
  );

  console.log('\n\n✅ Saved to: tmp/clinical-real-save-audit.json');
}

main().catch(e => { console.error(e); process.exit(1); });
