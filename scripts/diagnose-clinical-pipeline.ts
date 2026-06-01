import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { sanitizePatientUpdate } from '../lib/db/sanitizePatientUpdate';
import {
  CLINICAL_FIELD_DEFINITIONS,
  CLINICAL_ALIAS_TO_COLUMN,
} from '../lib/db/clinicalFields';
import { mapPatientUpdatesToDb } from '../lib/db/patientUpdateFields';

const LEGACY_FIELD_MAPPING: Record<string, string | null> = {
  inmate_name: 'inmate_name',
  age: 'age',
  sex: 'sex',
  contact_number: 'contact_number',
  address: 'address',
  facility_name: 'facility_name',
  dob: 'date_of_birth',
  date_of_birth: 'date_of_birth',
  screening_date: 'screening_date',
  staff_name: 'staff_name',
  submitted_on: 'submitted_on',
  screening_state: 'screening_state',
  screening_district: 'screening_district',
  facility_type: 'facility_type',
  unique_id: 'unique_id',
  inmate_type: 'inmate_type',
  father_husband_name: 'father_husband_name',
  xray_result: 'xray_result',
  symptoms_10s: 'symptoms_10s',
  tb_past_history: 'tb_past_history',
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
  Remarks: 'remarks',
  referral_date: 'referral_date',
  referred_facility: 'referred_facility',
  tb_diagnosed: 'tb_diagnosed',
  tb_diagnosis_date: 'tb_diagnosis_date',
  tb_type: 'tb_type',
  att_start_date: 'att_start_date',
  att_completion_date: 'att_completion_date',
  hiv_status: 'hiv_status',
  art_status: 'art_status',
  art_number: 'art_number',
  nikshay_abha_id: 'nikshay_abha_id',
  registration_date: 'registration_date',
  remarks: 'remarks',
  closure_reason: 'closure_reason',
  other_facility_name: 'other_facility_name',
  'Serial Number': null,
  KoboUUID: null,
  KoboID: null,
  id: null,
  updated_at: null,
};

type Mode = 'legacy' | 'current';

const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = ((modeArg?.split('=')[1] || 'current') as Mode);

const representativeValues: Record<string, unknown> = {
  referral_date: '2026-05-12',
  referred_facility: 'CBNAAT',
  tb_diagnosed: 'Y',
  tb_diagnosis_date: '2026-05-13',
  tb_type: 'Pulmonary',
  att_start_date: '2026-05-14',
  att_completion_date: '2026-11-14',
  hiv_status: 'Negative',
  art_status: 'On ART',
  art_number: 'ART-PIPELINE-001',
  nikshay_abha_id: 'NIKSHAY-PIPELINE-001',
  registration_date: '2026-05-15',
  remarks: 'Pipeline diagnostic remarks',
  other_facility_name: 'Pipeline other facility',
  closure_reason: 'Pipeline closure reason',
};

const suspectFlatKeys: Record<string, string> = {
  referral_date: 'referraldate',
  referred_facility: 'referredfacility',
  tb_diagnosed: 'tbdiagnosed',
  tb_diagnosis_date: 'tbdiagnosisdate',
  tb_type: 'tbtype',
  att_start_date: 'attstartdate',
  att_completion_date: 'attcompletiondate',
  hiv_status: 'hivstatus',
  art_status: 'artstatus',
  art_number: 'artnumber',
  nikshay_abha_id: 'nikshayabhaid',
  registration_date: 'nikshayregistrationdate',
  other_facility_name: 'otherfacilityname',
  closure_reason: 'closurereason',
};

function legacyMap(updates: Record<string, unknown>) {
  const dbUpdates: Record<string, unknown> = {};
  const events = Object.entries(updates).map(([inputKey, value]) => {
    const column = LEGACY_FIELD_MAPPING[inputKey];
    const included = !!column && value !== undefined && value !== null && value !== '';
    if (included) {
      dbUpdates[column] = value;
    }
    return {
      inputKey,
      column: column || null,
      included,
      reason: included
        ? undefined
        : !column
          ? 'unmapped'
          : value === ''
            ? 'empty_string'
            : value === null
              ? 'null'
              : value === undefined
                ? 'undefined'
                : 'unknown',
      value,
    };
  });

  return {
    dbUpdates,
    events,
    unmappedKeys: events.filter((event) => event.reason === 'unmapped').map((event) => event.inputKey),
    unmappedClinicalKeys: events.filter((event) => event.reason === 'unmapped').map((event) => event.inputKey),
    collisions: [],
  };
}

const payloads = [
  {
    name: 'clinical-tab-snake-payload',
    updates: Object.fromEntries(
      CLINICAL_FIELD_DEFINITIONS.map((field) => [
        field.column,
        representativeValues[field.column],
      ])
    ),
  },
  {
    name: 'react-hook-form-label-payload',
    updates: Object.fromEntries(
      CLINICAL_FIELD_DEFINITIONS.map((field) => [
        field.formKey,
        representativeValues[field.column],
      ])
    ),
  },
  {
    name: 'legacy-flat-payload',
    updates: Object.fromEntries(
      Object.entries(suspectFlatKeys).map(([column, key]) => [
        key,
        representativeValues[column],
      ])
    ),
  },
  {
    name: 'intentional-clears',
    updates: {
      referral_date: '',
      referred_facility: '',
      tb_diagnosis_date: '',
      remarks: '',
      nikshayabhaid: '',
    },
  },
  {
    name: 'metadata-and-unknown',
    updates: {
      id: 'ignored-id',
      updated_at: '2026-05-12T00:00:00.000Z',
      referredfacility: 'CBNAAT',
      made_up_clinical_tb_key: 'should warn',
    },
  },
];

const reports = payloads.map((payload) => {
  const sanitized = sanitizePatientUpdate(payload.updates);
  const mapped = mode === 'legacy' ? legacyMap(sanitized) : mapPatientUpdatesToDb(sanitized);
  const beforeKeys = Object.keys(payload.updates);
  const sanitizedKeys = Object.keys(sanitized);
  return {
    mode,
    payload: payload.name,
    beforeKeys,
    sanitizedKeys,
    droppedBySanitizer: beforeKeys.filter((key) => !sanitizedKeys.includes(key)),
    dbUpdates: mapped.dbUpdates,
    events: mapped.events,
    unmappedKeys: mapped.unmappedKeys,
    unmappedClinicalKeys: mapped.unmappedClinicalKeys,
    collisions: mapped.collisions,
  };
});

const inventory = CLINICAL_FIELD_DEFINITIONS.map((field) => {
  const flatKey = suspectFlatKeys[field.column] || '';
  return {
    section: field.section,
    label: field.label,
    formKey: field.formKey,
    canonicalPayloadKey: field.column,
    suspectFlatKey: flatKey,
    apiAcceptsCanonical: mode === 'legacy'
      ? LEGACY_FIELD_MAPPING[field.column] === field.column
      : CLINICAL_ALIAS_TO_COLUMN[field.column] === field.column,
    apiAcceptsFormKey: mode === 'legacy'
      ? LEGACY_FIELD_MAPPING[field.formKey] === field.column
      : CLINICAL_ALIAS_TO_COLUMN[field.formKey] === field.column,
    apiAcceptsFlatKey: flatKey
      ? mode === 'legacy'
        ? LEGACY_FIELD_MAPPING[flatKey] === field.column
        : CLINICAL_ALIAS_TO_COLUMN[flatKey] === field.column
      : null,
  };
});

const output = {
  generatedAt: new Date().toISOString(),
  mode,
  inventory,
  reports,
};

mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
const outPath = join(process.cwd(), 'tmp', `clinical-pipeline-diagnostics-${mode}.json`);
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);

console.log(`Clinical pipeline diagnostics (${mode})`);
console.log(`Wrote ${outPath}`);
console.table(
  reports.flatMap((report) =>
    report.events.map((event) => ({
      payload: report.payload,
      key: event.inputKey,
      column: event.column,
      included: event.included,
      reason: event.reason || '',
    }))
  )
);

const failingFlat = inventory
  .filter((row) => row.suspectFlatKey && !row.apiAcceptsFlatKey)
  .map((row) => row.suspectFlatKey);

console.log('Flat suspect keys not accepted:', failingFlat.length ? failingFlat.join(', ') : 'none');
