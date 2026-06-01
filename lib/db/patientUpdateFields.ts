import {
  CLINICAL_ALIAS_TO_COLUMN,
  CLINICAL_DATE_COLUMNS,
  looksLikeClinicalInputKey,
} from './clinicalFields';

type MappedColumn = string | null;

const BASE_FIELD_MAPPING: Record<string, MappedColumn> = {
  inmate_name: 'inmate_name',
  inmatename: 'inmate_name',
  age: 'age',
  sex: 'sex',
  contact_number: 'contact_number',
  contactnumber: 'contact_number',
  address: 'address',
  facility_name: 'facility_name',
  facilitycode: 'facility_name',
  dob: 'date_of_birth',
  date_of_birth: 'date_of_birth',
  dateofbirth: 'date_of_birth',
  screening_date: 'screening_date',
  screeningdate: 'screening_date',
  staff_name: 'staff_name',
  staffname: 'staff_name',
  submitted_on: 'submitted_on',
  submittedon: 'submitted_on',
  screening_state: 'screening_state',
  screeningstate: 'screening_state',
  screening_district: 'screening_district',
  screeningdistrict: 'screening_district',
  facility_type: 'facility_type',
  facilitytype: 'facility_type',
  unique_id: 'unique_id',
  uniqueid: 'unique_id',
  inmate_type: 'inmate_type',
  inmatetype: 'inmate_type',
  father_husband_name: 'father_husband_name',
  fatherhusbandname: 'father_husband_name',
  xray_result: 'xray_result',
  xrayresult: 'xray_result',
  chest_x_ray_result: 'chest_x_ray_result',
  symptoms_10s: 'symptoms_10s',
  symptoms10s: 'symptoms_10s',
  tb_past_history: 'tb_past_history',
  tbpasthistory: 'tb_past_history',
  treatment_regimen: 'treatment_regimen',
  treatmentregimen: 'treatment_regimen',
  ai_link_status: 'ai_link_status',

  'Serial Number': null,
  Serial_Number: null,
  KoboUUID: null,
  KoboID: null,
  id: null,
  kobo_uuid: null,
  updated_at: null,
  created_at: null,
  sheets_synced_at: null,
  synced_to_sheets: null,
  sheets_sync_attempts: null,
  sheets_sync_error: null,
  client_timestamp: null,
  _optimistic: null,
  _localId: null,
  _dirty: null,
  dirty: null,
  matches: null,
  matchStatus: null,
};

const DATE_COLUMNS = new Set([
  'date_of_birth',
  'screening_date',
  'referral_date',
  'tb_diagnosis_date',
  'att_start_date',
  'att_completion_date',
  'registration_date',
]);

const NUMBER_COLUMNS = new Set(['age']);

export interface FieldMappingEvent {
  inputKey: string;
  column: string | null;
  included: boolean;
  reason?: string;
  value: unknown;
}

export interface PatientUpdateMappingResult {
  dbUpdates: Record<string, unknown>;
  events: FieldMappingEvent[];
  unmappedKeys: string[];
  unmappedClinicalKeys: string[];
  collisions: Array<{
    column: string;
    previousKey: string;
    nextKey: string;
  }>;
}

export const PATIENT_UPDATE_FIELD_MAPPING: Record<string, MappedColumn> = {
  ...BASE_FIELD_MAPPING,
  ...CLINICAL_ALIAS_TO_COLUMN,
};

export function mapPatientUpdatesToDb(
  updates: Record<string, unknown>
): PatientUpdateMappingResult {
  const dbUpdates: Record<string, unknown> = {};
  const sourceByColumn: Record<string, string> = {};
  const events: FieldMappingEvent[] = [];
  const unmappedKeys: string[] = [];
  const unmappedClinicalKeys: string[] = [];
  const collisions: PatientUpdateMappingResult['collisions'] = [];

  for (const [inputKey, value] of Object.entries(updates)) {
    const column = PATIENT_UPDATE_FIELD_MAPPING[inputKey];

    if (column === null) {
      events.push({
        inputKey,
        column,
        included: false,
        reason: 'ignored_metadata',
        value,
      });
      continue;
    }

    if (!column) {
      unmappedKeys.push(inputKey);
      if (looksLikeClinicalInputKey(inputKey)) {
        unmappedClinicalKeys.push(inputKey);
      }
      events.push({
        inputKey,
        column: null,
        included: false,
        reason: 'unmapped',
        value,
      });
      continue;
    }

    if (value === undefined) {
      events.push({
        inputKey,
        column,
        included: false,
        reason: 'undefined',
        value,
      });
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(dbUpdates, column)) {
      collisions.push({
        column,
        previousKey: sourceByColumn[column],
        nextKey: inputKey,
      });
    }

    const normalizedValue = normalizeDbValue(column, value);
    dbUpdates[column] = normalizedValue;
    sourceByColumn[column] = inputKey;
    events.push({
      inputKey,
      column,
      included: true,
      value: normalizedValue,
    });
  }

  return {
    dbUpdates,
    events,
    unmappedKeys,
    unmappedClinicalKeys,
    collisions,
  };
}

function normalizeDbValue(column: string, value: unknown): unknown {
  if (value === '') {
    if (DATE_COLUMNS.has(column) || CLINICAL_DATE_COLUMNS.has(column as never)) {
      return null;
    }
    if (NUMBER_COLUMNS.has(column)) {
      return null;
    }
    return '';
  }

  if (value === null) {
    return null;
  }

  if (NUMBER_COLUMNS.has(column) && typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }

  if (DATE_COLUMNS.has(column) && typeof value === 'string') {
    return normalizeDateString(value);
  }

  return value;
}

function normalizeDateString(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year =
      ddmmyyyy[3].length === 2 ? `20${ddmmyyyy[3]}` : ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return trimmed;
}
