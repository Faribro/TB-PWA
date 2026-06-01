import { CLINICAL_FORM_FIELD_TO_COLUMN, CLINICAL_DATE_COLUMNS } from './clinicalFields';

type FormData = Record<string, any>;
type DbPatient = Record<string, any>;

interface ClinicalDiffPayloadOptions {
  formData: FormData;
  fetchedPatient: DbPatient;
  onLog?: (message: string, data?: any) => void;
}

interface DiffFieldResult {
  formKey: string;
  dbColumn: string;
  formValue: any;
  dbValue: any;
  status: 'unchanged' | 'changed' | 'intentional_clear' | 'added';
  included: boolean;
}

/**
 * Normalizes date inputs and database date values to YYYY-MM-DD format for robust comparisons.
 */
function normalizeDate(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim();
  if (!str) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY or similar
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3].length === 2 ? `20${ddmmyyyy[3]}` : ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // General parsing (e.g. ISO string)
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return str;
}

export function buildClinicalDiffPayload({
  formData,
  fetchedPatient,
  onLog
}: ClinicalDiffPayloadOptions): {
  payload: Record<string, any>;
  diffResults: DiffFieldResult[];
} {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString()
  };
  const diffResults: DiffFieldResult[] = [];

  onLog?.('🔄 Building clinical diff payload', {
    formKeys: Object.keys(formData),
    dbKeys: Object.keys(fetchedPatient || {})
  });

  for (const [formKey, dbColumn] of Object.entries(CLINICAL_FORM_FIELD_TO_COLUMN)) {
    // Get form value (use empty string if key not present in formData)
    const formValue = Object.prototype.hasOwnProperty.call(formData, formKey)
      ? (formData[formKey] ?? '')
      : '';

    // Get DB value
    const dbValue = fetchedPatient?.[dbColumn];

    // Normalize for comparison
    let finalFormValue = formValue;
    let finalDbValue = dbValue;

    if (CLINICAL_DATE_COLUMNS.has(dbColumn)) {
      finalFormValue = normalizeDate(formValue);
      finalDbValue = normalizeDate(dbValue);
    } else {
      finalFormValue = (formValue !== null && formValue !== undefined) ? String(formValue).trim() : '';
      finalDbValue = (dbValue !== null && dbValue !== undefined) ? String(dbValue).trim() : '';
    }

    const dbHasValue = finalDbValue !== null && finalDbValue !== '';
    const formHasValue = finalFormValue !== null && finalFormValue !== '';

    let status: DiffFieldResult['status'] = 'unchanged';
    let included = false;

    // Determine status
    if (!dbHasValue && formHasValue) {
      status = 'added';
      included = true;
    } else if (dbHasValue && !formHasValue) {
      status = 'intentional_clear';
      included = true;
    } else if (dbHasValue && formHasValue) {
      // Only consider changed if values are actually different
      if (finalFormValue !== finalDbValue) {
        status = 'changed';
        included = true;
      } else {
        status = 'unchanged';
      }
    } else {
      // Both empty, no-op
      status = 'unchanged';
    }

    if (included) {
      payload[dbColumn] = formValue;
      onLog?.(`📝 Including field in payload: ${formKey} (${dbColumn})`, {
        status,
        formValue,
        dbValue,
        normalizedForm: finalFormValue,
        normalizedDb: finalDbValue
      });
    } else {
      onLog?.(`⏭️ Skipping unchanged field: ${formKey} (${dbColumn})`, {
        formValue,
        dbValue,
        normalizedForm: finalFormValue,
        normalizedDb: finalDbValue
      });
    }

    diffResults.push({
      formKey,
      dbColumn,
      formValue,
      dbValue,
      status,
      included
    });
  }

  const includedCount = diffResults.filter(r => r.included).length;
  onLog?.(`✅ Payload built with ${includedCount} fields to update`, {
    payloadKeys: Object.keys(payload),
    diffResults
  });

  return {
    payload,
    diffResults
  };
}

