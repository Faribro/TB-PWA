/**
 * scripts/recover-clinical-data-from-sheets.ts
 *
 * Recovers clinical data that was wiped from Supabase by the destructive
 * partial-save bug. Reads original values from Google Sheets and backfills
 * only null/empty fields in Supabase — never overwrites existing values.
 *
 * Usage:
 *   bun run scripts/recover-clinical-data-from-sheets.ts                # dry-run (default)
 *   bun run scripts/recover-clinical-data-from-sheets.ts --dry-run=false # live recovery
 *
 * Env: Loads .env.production for GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SHEET_ID,
 *      and Supabase credentials.
 */

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// ═══════════════════════════════════════════════════════════════════════════
// ENV LOADING — load in standard Next.js priority order (highest to lowest)
// ═══════════════════════════════════════════════════════════════════════════
const envFiles = [
  '.env.production.local',
  '.env.local',
  '.env.production',
  '.env'
];
for (const file of envFiles) {
  dotenv.config({ path: path.join(process.cwd(), file), override: false });
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const SHEET_NAME = 'Patient Linelist_TB';
const HEADER_ROW = 3; // 1-indexed; data starts at row 4
const SUPABASE_BATCH_SIZE = 50; // records per upsert batch

/**
 * Sheets column indices (0-indexed within each data row).
 * Verified against google-apps-script/Send-To-Supabase.js mapRowToSupabaseJson_()
 */
const SHEET_COL = {
  unique_id:           7,
  kobo_uuid:          32,
  referral_date:      19,
  referred_facility:  20,
  tb_diagnosed:       21,
  tb_diagnosis_date:  22,
  tb_type:            23,
  att_start_date:     24,
  att_completion_date:25,
  hiv_status:         26,
  art_status:         27,
  art_number:         28,
  nikshay_abha_id:    29,
  registration_date:  30,
  remarks:            31,
} as const;

/** The 13 clinical fields we are recovering (excludes other_facility_name — not in Sheets) */
const CLINICAL_FIELDS: (keyof typeof SHEET_COL)[] = [
  'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
  'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status',
  'art_status', 'art_number', 'nikshay_abha_id', 'registration_date', 'remarks',
];

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
interface DamagedRecord {
  id: string;
  kobo_uuid: string | null;
  unique_id: string | null;
  inmate_name: string | null;
  screening_state: string | null;
  empty_clinical_fields: string[];
  populated_clinical_fields: string[];
}

interface RecoveryResult {
  id: string;
  patient_id: string;
  unique_id: string | null;
  kobo_uuid: string | null;
  name: string | null;
  inmate_name: string | null;
  state: string | null;
  screening_state: string | null;
  matched_in_sheets: boolean;
  match_key: string | null; // which key matched: 'unique_id' | 'kobo_uuid' | null
  fields_recoverable: string[];
  fields_already_populated: string[];
  fields_missing: string[];
  fields_empty_in_both: string[];
  recovery_payload: Record<string, any>;
  write_status: 'dry_run' | 'written' | 'skipped' | 'error';
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function isEmpty(val: any): boolean {
  if (val === null || val === undefined) return true;
  const s = String(val).trim();
  return s === '' || s === 'null' || s === 'undefined';
}

function cleanUuid(raw: any): string {
  if (!raw) return '';
  return String(raw).replace(/^uuid:/i, '').trim();
}

function normalizeForLookup(val: any): string {
  if (!val) return '';
  return String(val).trim().toLowerCase();
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const dryRun = !process.argv.includes('--dry-run=false');

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔄 CLINICAL DATA RECOVERY FROM GOOGLE SHEETS');
  console.log(`   Mode: ${dryRun ? '🟡 DRY RUN (no writes)' : '🔴 LIVE RECOVERY (will write to Supabase)'}`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // ── Step 1: Validate env ────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const saKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!sheetId) {
    console.error('❌ Missing GOOGLE_SHEET_ID');
    process.exit(1);
  }
  if (!saKeyRaw) {
    console.error('❌ Missing GOOGLE_SERVICE_ACCOUNT_KEY');
    process.exit(1);
  }

  let saCredentials: any;
  try {
    let cleanKey = saKeyRaw.trim();
    if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
      cleanKey = cleanKey.slice(1, -1);
    }
    
    // Robust cleaning for double-escaped env variables (common in production/vercel envs)
    let jsonStr = cleanKey.replace(/\\\r?\n/g, '\\n');
    jsonStr = jsonStr.replace(/\\"/g, '"');
    
    saCredentials = JSON.parse(jsonStr);
    
    // Normalize newlines in private key (replace escaped \n with real newlines)
    if (saCredentials.private_key && typeof saCredentials.private_key === 'string') {
      saCredentials.private_key = saCredentials.private_key.replace(/\\n/g, '\n');
    }
  } catch (e) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON:', (e as Error).message);
    process.exit(1);
  }

  console.log('✅ Environment validated');
  console.log(`   Supabase: ${supabaseUrl}`);
  console.log(`   Sheet ID: ${sheetId}`);
  console.log(`   SA email: ${saCredentials.client_email}\n`);

  // ── Step 2: Load damaged records ────────────────────────────────────────
  const damageReportPath = path.join(process.cwd(), 'tmp', 'clinical-data-loss-risk.json');
  if (!fs.existsSync(damageReportPath)) {
    console.error(`❌ Damage report not found: ${damageReportPath}`);
    process.exit(1);
  }

  const damageReport = JSON.parse(fs.readFileSync(damageReportPath, 'utf-8'));
  const damagedRecords: DamagedRecord[] = damageReport.records;
  console.log(`📋 Loaded ${damagedRecords.length} damaged records from damage report\n`);

  // ── Step 3: Fetch Google Sheets data ────────────────────────────────────
  console.log('📊 Fetching Google Sheets data...');
  const auth = new google.auth.GoogleAuth({
    credentials: saCredentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Fetch ALL data from the sheet (row 4 onward = after 3 header rows)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${SHEET_NAME}'!A${HEADER_ROW + 1}:AJ`,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const sheetRows = response.data.values || [];
  console.log(`   Fetched ${sheetRows.length} rows from "${SHEET_NAME}"\n`);

  if (sheetRows.length === 0) {
    console.error('❌ No data found in sheet');
    process.exit(1);
  }

  // ── Step 4: Index sheet rows by unique_id and kobo_uuid ─────────────────
  console.log('🗂️  Building lookup indexes...');
  const indexByUniqueId = new Map<string, any[]>();
  const indexByKoboUuid = new Map<string, any[]>();

  for (const row of sheetRows) {
    const uid = normalizeForLookup(row[SHEET_COL.unique_id]);
    const kuuid = normalizeForLookup(cleanUuid(row[SHEET_COL.kobo_uuid]));

    if (uid) {
      indexByUniqueId.set(uid, row);
    }
    if (kuuid) {
      indexByKoboUuid.set(kuuid, row);
    }
  }

  console.log(`   unique_id index: ${indexByUniqueId.size} entries`);
  console.log(`   kobo_uuid index: ${indexByKoboUuid.size} entries\n`);

  // ── Step 5: Initialize Supabase client ──────────────────────────────────
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  });

  // ── Step 6: Process each damaged record ─────────────────────────────────
  console.log('🔍 Processing damaged records...\n');

  const results: RecoveryResult[] = [];
  let matchedCount = 0;
  let notFoundCount = 0;
  let totalFieldsRecoverable = 0;
  let totalFieldsEmptyInBoth = 0;
  let totalFieldsAlreadyPopulated = 0;
  let writeSuccessCount = 0;
  let writeErrorCount = 0;

  for (let i = 0; i < damagedRecords.length; i++) {
    const record = damagedRecords[i];
    const result: RecoveryResult = {
      id: record.id,
      patient_id: record.id,
      unique_id: record.unique_id,
      kobo_uuid: record.kobo_uuid,
      name: record.inmate_name,
      inmate_name: record.inmate_name,
      state: record.screening_state,
      screening_state: record.screening_state,
      matched_in_sheets: false,
      match_key: null,
      fields_recoverable: [],
      fields_already_populated: [],
      fields_missing: [],
      fields_empty_in_both: [],
      recovery_payload: {},
      write_status: 'skipped',
    };

    // Look up in Sheets: unique_id first, kobo_uuid as fallback
    let sheetRow: any[] | undefined;

    if (record.unique_id) {
      sheetRow = indexByUniqueId.get(normalizeForLookup(record.unique_id));
      if (sheetRow) result.match_key = 'unique_id';
    }

    if (!sheetRow && record.kobo_uuid) {
      sheetRow = indexByKoboUuid.get(normalizeForLookup(record.kobo_uuid));
      if (sheetRow) result.match_key = 'kobo_uuid';
    }

    if (!sheetRow) {
      notFoundCount++;
      result.fields_missing = [...record.empty_clinical_fields];
      result.fields_empty_in_both = [...record.empty_clinical_fields];
      results.push(result);
      continue;
    }

    result.matched_in_sheets = true;
    matchedCount++;

    // Compare each clinical field
    for (const field of CLINICAL_FIELDS) {
      const colIdx = SHEET_COL[field];
      const sheetValue = sheetRow[colIdx];
      const dbIsEmpty = record.empty_clinical_fields.includes(field);
      const dbIsPopulated = record.populated_clinical_fields.includes(field);

      if (dbIsPopulated) {
        // DB already has a value — skip, never overwrite
        result.fields_already_populated.push(field);
        totalFieldsAlreadyPopulated++;
      } else if (!isEmpty(sheetValue)) {
        // DB is empty AND Sheets has a value — recoverable!
        result.fields_recoverable.push(field);
        result.recovery_payload[field] = String(sheetValue).trim();
        totalFieldsRecoverable++;
      } else {
        // Both DB and Sheets are empty — nothing to recover
        result.fields_empty_in_both.push(field);
        result.fields_missing.push(field);
        totalFieldsEmptyInBoth++;
      }
    }

    // Decide whether to write
    if (Object.keys(result.recovery_payload).length === 0) {
      result.write_status = 'skipped';
    } else if (dryRun) {
      result.write_status = 'dry_run';
    } else {
      // LIVE WRITE
      try {
        const { error } = await supabase
          .from('patients')
          .update(result.recovery_payload)
          .eq('id', record.id);

        if (error) {
          result.write_status = 'error';
          result.error = error.message;
          writeErrorCount++;
        } else {
          result.write_status = 'written';
          writeSuccessCount++;
        }
      } catch (e: any) {
        result.write_status = 'error';
        result.error = e.message;
        writeErrorCount++;
      }
    }

    results.push(result);

    // Progress log every 2000 records
    if ((i + 1) % 2000 === 0 || i === damagedRecords.length - 1) {
      console.log(`   Processed ${i + 1}/${damagedRecords.length} | Matched: ${matchedCount} | Not found: ${notFoundCount} | Fields recoverable: ${totalFieldsRecoverable}`);
    }
  }

  // ── Step 7: Summary ─────────────────────────────────────────────────────
  const recordsWithRecoverableFields = results.filter(r => r.fields_recoverable.length > 0).length;

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 RECOVERY SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`   Mode:                         ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Total damaged records:         ${damagedRecords.length}`);
  console.log(`   Found in Sheets:               ${matchedCount}`);
  console.log(`   NOT found in Sheets:           ${notFoundCount}`);
  console.log(`   Records with recoverable data: ${recordsWithRecoverableFields}`);
  console.log(`   Total fields recoverable:      ${totalFieldsRecoverable}`);
  console.log(`   Fields already populated in DB: ${totalFieldsAlreadyPopulated}`);
  console.log(`   Fields empty in both:          ${totalFieldsEmptyInBoth}`);

  if (!dryRun) {
    console.log(`   ✅ Writes succeeded:           ${writeSuccessCount}`);
    console.log(`   ❌ Write errors:               ${writeErrorCount}`);
  }

  // Per-field breakdown
  const fieldCounts: Record<string, number> = {};
  for (const field of CLINICAL_FIELDS) fieldCounts[field] = 0;
  for (const r of results) {
    for (const f of r.fields_recoverable) {
      fieldCounts[f] = (fieldCounts[f] || 0) + 1;
    }
  }
  console.log('\n   Per-field recovery breakdown:');
  for (const [field, count] of Object.entries(fieldCounts).sort((a, b) => b[1] - a[1])) {
    const pct = matchedCount > 0 ? ((count / matchedCount) * 100).toFixed(1) : '0';
    console.log(`     ${field.padEnd(25)} ${String(count).padStart(6)} records (${pct}%)`);
  }

  // Sample output
  console.log('\n   Sample recoverable records (first 5):');
  const samples = results.filter(r => r.fields_recoverable.length > 0).slice(0, 5);
  for (const s of samples) {
    console.log(`     ${s.inmate_name?.trim() || 'N/A'} (${s.screening_state || 'N/A'}) — ${s.fields_recoverable.length} fields: ${s.fields_recoverable.join(', ')}`);
    for (const [k, v] of Object.entries(s.recovery_payload)) {
      console.log(`       ${k}: "${v}"`);
    }
  }

  // ── Step 8: Write reports ───────────────────────────────────────────────
  const reportDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const jsonReportPath = path.join(reportDir, 'clinical-recovery-report.json');
  const csvReportPath = path.join(reportDir, 'clinical-recovery-report.csv');

  const jsonReport = {
    recovery_date: new Date().toISOString(),
    mode: dryRun ? 'dry_run' : 'live',
    summary: {
      total_damaged_records: damagedRecords.length,
      matched_in_sheets: matchedCount,
      not_found_in_sheets: notFoundCount,
      records_with_recoverable_data: recordsWithRecoverableFields,
      total_fields_recoverable: totalFieldsRecoverable,
      fields_already_populated: totalFieldsAlreadyPopulated,
      fields_empty_in_both: totalFieldsEmptyInBoth,
      writes_succeeded: writeSuccessCount,
      write_errors: writeErrorCount,
      per_field_counts: fieldCounts,
    },
    records: results,
  };

  fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2));
  console.log(`\n✅ JSON report saved: ${jsonReportPath}`);

  // CSV
  const csvHeader = 'id,patient_id,unique_id,kobo_uuid,name,inmate_name,state,screening_state,matched_in_sheets,match_key,fields_recoverable_count,fields_recoverable,fields_missing_count,fields_missing,write_status\n';
  const csvRows = results.map(r => {
    const name = (r.name || '').replace(/"/g, '""');
    const state = (r.state || '').replace(/"/g, '""');
    const recoverFields = r.fields_recoverable.join('; ');
    const missingFields = r.fields_missing.join('; ');
    return `"${r.id}","${r.patient_id}","${r.unique_id || ''}","${r.kobo_uuid || ''}","${name}","${r.inmate_name || ''}","${state}","${r.screening_state || ''}","${r.matched_in_sheets}","${r.match_key || ''}","${r.fields_recoverable.length}","${recoverFields}","${r.fields_missing.length}","${missingFields}","${r.write_status}"`;
  }).join('\n');

  fs.writeFileSync(csvReportPath, csvHeader + csvRows);
  console.log(`✅ CSV report saved: ${csvReportPath}`);

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  if (dryRun) {
    console.log('🟡 DRY RUN COMPLETE — No data was written to Supabase.');
    console.log('   To execute live recovery, run with: --dry-run=false');
  } else {
    console.log('🟢 LIVE RECOVERY COMPLETE');
  }
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
