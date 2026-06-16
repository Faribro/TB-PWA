import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  CLINICAL_DB_COLUMNS,
  CLINICAL_FIELD_DEFINITIONS,
} from '../lib/db/clinicalFields';

type JsonRecord = Record<string, any>;

const tagArg = process.argv.find((arg) => arg.startsWith('--tag='));
const tag = tagArg?.split('=')[1] || 'manual';
const apiArg = process.argv.find((arg) => arg.startsWith('--api='));
const apiBaseUrl = (apiArg?.split('=')[1] || 'http://localhost:3000').replace(/\/$/, '');
const variantArg = process.argv.find((arg) => arg.startsWith('--variant='));
const variantFilter = variantArg?.split('=')[1] || 'all';

loadEnv('.env.local');
loadEnv('.env');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const valuesByColumn: Record<string, unknown> = {
  referral_date: '2026-05-12',
  referred_facility: 'CBNAAT',
  tb_diagnosed: 'Y',
  tb_diagnosis_date: '2026-05-13',
  tb_type: 'Pulmonary',
  att_start_date: '2026-05-14',
  att_completion_date: '2026-11-14',
  hiv_status: 'Negative',
  art_status: 'On ART',
  art_number: `ART-${Date.now()}`,
  nikshay_abha_id: `NIK-${Date.now()}`,
  registration_date: '2026-05-15',
  remarks: `Roundtrip ${tag}`,
  other_facility_name: `Other facility ${tag}`,
  closure_reason: `Closure ${tag}`,
};

const flatKeyByColumn: Record<string, string> = {
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
  remarks: 'remarks',
  other_facility_name: 'otherfacilityname',
  closure_reason: 'closurereason',
};

async function main() {
  const schema = await verifySchema();
  const existingColumns = CLINICAL_DB_COLUMNS.filter((column) => schema[column]);

  if (!existingColumns.length) {
    throw new Error('No clinical columns were detected in the patients table');
  }

  const selectColumns = ['id', 'kobo_uuid', ...existingColumns].join(',');
  const { data: rows, error: patientError } = await supabase
    .from('patients')
    .select(selectColumns)
    .limit(1);

  if (patientError) {
    throw new Error(`Could not load a patient row: ${patientError.message}`);
  }
  if (!rows || rows.length === 0) {
    throw new Error('No patient rows available for roundtrip test');
  }

  const patient = rows[0] as JsonRecord;
  const patientIdentifier = patient.kobo_uuid || patient.id;
  const originalValues = Object.fromEntries(
    existingColumns.map((column) => [column, patient[column] ?? null])
  );

  const results: JsonRecord[] = [];

  try {
    for (const definition of CLINICAL_FIELD_DEFINITIONS) {
      if (!schema[definition.column]) {
        results.push({
          field: definition.column,
          label: definition.label,
          variant: 'schema',
          skipped: true,
          reason: 'column_missing',
        });
        continue;
      }

      const variants = [
        {
          name: 'canonical-snake',
          payloadKey: definition.column,
          value: valuesByColumn[definition.column],
        },
        {
          name: 'form-label',
          payloadKey: definition.formKey,
          value: valuesByColumn[definition.column],
        },
        {
          name: 'legacy-flat',
          payloadKey: flatKeyByColumn[definition.column],
          value: valuesByColumn[definition.column],
        },
      ].filter((variant) =>
        variant.payloadKey &&
        (variantFilter === 'all' || variantFilter === variant.name)
      );

      if (definition.type === 'date' || definition.type === 'text') {
        variants.push({
          name: 'intentional-clear',
          payloadKey: definition.column,
          value: '',
        });
      }

      for (const variant of variants) {
        if (variant.name === 'intentional-clear') {
          await supabase
            .from('patients')
            .update({
              [definition.column]: seedValue(definition.column),
              updated_at: new Date().toISOString(),
            })
            .eq('id', patient.id);
        }

        const before = await readClinicalRow(patient.id, existingColumns);
        const updateValue =
          variant.name === 'intentional-clear'
            ? ''
            : distinctValue(definition.column, variant.value, before[definition.column]);
        const apiResponse = await postPatientSync(patientIdentifier, {
          [variant.payloadKey]: updateValue,
        });
        const after = await readClinicalRow(patient.id, existingColumns);
        const expectedDbValue =
          variant.name === 'intentional-clear' && definition.type === 'date'
            ? null
            : updateValue;
        const actual = after[definition.column] ?? null;
        const changedColumns = existingColumns.filter(
          (column) => normalizeValue(before[column]) !== normalizeValue(after[column])
        );

        results.push({
          field: definition.column,
          label: definition.label,
          variant: variant.name,
          payloadKey: variant.payloadKey,
          requestValue: updateValue,
          expectedDbValue,
          apiStatus: apiResponse.status,
          apiOk: apiResponse.ok,
          apiSuccess: apiResponse.body?.success === true,
          responseValue: apiResponse.body?.patient?.[definition.column] ?? null,
          dbValue: actual,
          persisted: normalizeValue(actual) === normalizeValue(expectedDbValue),
          beforeValue: before[definition.column] ?? null,
          changedColumns,
          wrongColumnChanged: changedColumns.some((column) => column !== definition.column),
          error: apiResponse.body?.error || apiResponse.body?.details || null,
        });

        await restore(patient.id, originalValues);
      }
    }
  } finally {
    await restore(patient.id, originalValues);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    tag,
    apiBaseUrl,
    patient: {
      id: maskIdentifier(patient.id),
      kobo_uuid: patient.kobo_uuid ? maskIdentifier(patient.kobo_uuid) : null,
      identifierUsed: patientIdentifier === patient.kobo_uuid ? 'kobo_uuid' : 'id',
    },
    schema,
    results,
  };

  mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
  const outPath = join(process.cwd(), 'tmp', `clinical-roundtrip-${tag}.json`);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Clinical roundtrip (${tag})`);
  console.log(`API: ${apiBaseUrl}`);
  console.log(`Wrote ${outPath}`);
  console.table(
    results.map((result) => ({
      field: result.field,
      variant: result.variant,
      key: result.payloadKey || '',
      status: result.apiStatus || '',
      persisted: result.persisted === true,
      changed: (result.changedColumns || []).join(','),
      error: result.error || '',
    }))
  );
}

async function verifySchema() {
  const schema: Record<string, boolean> = {};
  for (const column of CLINICAL_DB_COLUMNS) {
    const { error } = await supabase
      .from('patients')
      .select(`id,${column}`)
      .limit(1);
    schema[column] = !error;
  }
  return schema;
}

async function readClinicalRow(id: string, columns: string[]) {
  const { data, error } = await supabase
    .from('patients')
    .select(['id', ...columns].join(','))
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error(`Could not reread patient row: ${error?.message || 'not found'}`);
  }
  return data as JsonRecord;
}

async function restore(id: string, values: JsonRecord) {
  const { error } = await supabase
    .from('patients')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to restore patient row: ${error.message}`);
  }
}

async function postPatientSync(patientId: string, updates: JsonRecord) {
  const response = await fetch(`${apiBaseUrl}/api/patient-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ patientId, updates }),
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = { error: 'NON_JSON_RESPONSE', text: await response.text().catch(() => '') };
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

function distinctValue(column: string, value: unknown, before: unknown) {
  if (column === 'tb_diagnosed') {
    return before === 'Y' ? 'N' : 'Y';
  }
  if (column === 'tb_type') {
    return before === 'Pulmonary' ? 'Extrapulmonary Tuberculosis' : 'Pulmonary';
  }
  if (column === 'hiv_status') {
    return before === 'Positive' ? 'Negative' : 'Positive';
  }
  if (column === 'art_status') {
    return before === 'On ART' ? 'Pre ART' : 'On ART';
  }

  if (typeof value !== 'string') return value;
  if (!value) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const candidate = `${value}-${tag}`;
  return candidate === before ? `${candidate}-2` : candidate;
}

function seedValue(column: string) {
  if (column === 'tb_diagnosed') return 'Y';
  if (column === 'tb_type') return 'Pulmonary';
  if (column === 'hiv_status') return 'Positive';
  if (column === 'art_status') return 'On ART';
  if (column.endsWith('_date')) return '2026-05-20';
  if (column === 'registration_date') return '2026-05-20';
  return `seed-${column}-${tag}`;
}

function normalizeValue(value: unknown) {
  return value === undefined ? null : value;
}

function maskIdentifier(value: string) {
  if (!value || value.length <= 8) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function loadEnv(fileName: string) {
  const envPath = join(process.cwd(), fileName);
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
