/**
 * scripts/report-clinical-data-loss-risk.ts
 *
 * Scans the database for patient records that match the destructive partial-save
 * bug signature:
 * - hiv_status is populated
 * - most other clinical fields (>= 10 out of 13) are null or empty
 * - updated_at is later than screening_date or submitted_on
 *
 * Outputs report to:
 * - tmp/clinical-data-loss-risk.json
 * - tmp/clinical-data-loss-risk.csv
 *
 * Run: bun run scripts/report-clinical-data-loss-risk.ts
 */

import { getSupabaseClient } from '../lib/supabase-server';
import fs from 'fs';
import path from 'path';

const CLINICAL_FIELDS = [
  'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
  'tb_type', 'att_start_date', 'att_completion_date', 'art_status',
  'art_number', 'nikshay_abha_id', 'registration_date', 'remarks',
  'other_facility_name'
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 HISTORICAL CLINICAL DATA LOSS RISK SCANNER');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const supabase = getSupabaseClient();
  const reportDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const jsonPath = path.join(reportDir, 'clinical-data-loss-risk.json');
  const csvPath = path.join(reportDir, 'clinical-data-loss-risk.csv');

  console.log('Fetching patient records from Supabase...');
  
  let allPatients: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    console.log(`   - Fetching records ${from} to ${to}...`);
    const { data, error } = await supabase
      .from('patients')
      .select('id, kobo_uuid, unique_id, inmate_name, screening_state, screening_date, submitted_on, updated_at, hiv_status, ' + CLINICAL_FIELDS.join(','))
      .range(from, to);

    if (error) {
      console.error('❌ Error fetching patients:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allPatients = allPatients.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  console.log(`\nFetched ${allPatients.length} total patient records.`);
  console.log('Running analysis heuristics...');

  const damagedRecords: any[] = [];
  let totalChecked = 0;

  for (const patient of allPatients) {
    totalChecked++;
    
    const hiv = patient.hiv_status;
    const hasHiv = hiv !== null && hiv !== undefined && String(hiv).trim() !== '';
    
    if (!hasHiv) {
      continue; // Bug signature requires HIV status to be edited/populated in the drawer
    }

    // Count how many of the other 13 clinical fields are empty
    let emptyCount = 0;
    const emptyFields: string[] = [];
    const populatedFields: string[] = [];

    CLINICAL_FIELDS.forEach(f => {
      const val = patient[f];
      if (val === null || val === undefined || String(val).trim() === '') {
        emptyCount++;
        emptyFields.push(f);
      } else {
        populatedFields.push(f);
      }
    });

    // Check if updated_at is later than screening_date or submitted_on
    const updatedAtTime = patient.updated_at ? new Date(patient.updated_at).getTime() : 0;
    const screeningDateTime = patient.screening_date ? new Date(patient.screening_date).getTime() : 0;
    const submittedOnTime = patient.submitted_on ? new Date(patient.submitted_on).getTime() : 0;

    const baselineTime = Math.max(screeningDateTime, submittedOnTime);
    
    // We check if it was updated at least 10 seconds after baseline creation
    const hasBeenEdited = baselineTime > 0 && updatedAtTime > baselineTime + 10000;

    // Signature matches if HIV is populated, >= 10 clinical fields are empty, and it has been edited in the drawer
    const isLikelyDamaged = emptyCount >= 10 && hasBeenEdited;

    if (isLikelyDamaged) {
      damagedRecords.push({
        id: patient.id,
        kobo_uuid: patient.kobo_uuid,
        unique_id: patient.unique_id,
        inmate_name: patient.inmate_name,
        screening_state: patient.screening_state,
        submitted_on: patient.submitted_on,
        screening_date: patient.screening_date,
        updated_at: patient.updated_at,
        hiv_status: hiv,
        empty_clinical_fields_count: emptyCount,
        populated_clinical_fields: populatedFields,
        empty_clinical_fields: emptyFields
      });
    }
  }

  console.log(`\nAnalysis complete:`);
  console.log(`   - Total records checked: ${totalChecked}`);
  console.log(`   - Likely damaged records identified: ${damagedRecords.length}`);

  // Write JSON
  fs.writeFileSync(jsonPath, JSON.stringify({
    scan_date: new Date().toISOString(),
    total_records_checked: totalChecked,
    damaged_records_count: damagedRecords.length,
    records: damagedRecords
  }, null, 2));
  console.log(`✅ Saved JSON report to: ${jsonPath}`);

  // Write CSV
  const csvHeaders = 'patient_id,kobo_uuid,unique_id,inmate_name,screening_state,screening_date,submitted_on,updated_at,hiv_status,empty_fields_count,populated_fields\n';
  const csvRows = damagedRecords.map(r => {
    const name = (r.inmate_name || '').replace(/"/g, '""');
    const state = (r.screening_state || '').replace(/"/g, '""');
    const populated = r.populated_clinical_fields.join('; ');
    return `"${r.id}","${r.kobo_uuid || ''}","${r.unique_id || ''}","${name}","${state}","${r.screening_date || ''}","${r.submitted_on || ''}","${r.updated_at || ''}","${r.hiv_status}","${r.empty_clinical_fields_count}","${populated}"`;
  }).join('\n');

  fs.writeFileSync(csvPath, csvHeaders + csvRows);
  console.log(`✅ Saved CSV report to: ${csvPath}`);

  console.log('\nList of likely damaged records:');
  if (damagedRecords.length === 0) {
    console.log('   (None found)');
  } else {
    damagedRecords.forEach((r, idx) => {
      console.log(`   ${idx + 1}. Patient: ${r.inmate_name} | State: ${r.screening_state} | ID: ${r.id} | Empty Fields: ${r.empty_clinical_fields_count}/13 | Populated: ${r.populated_clinical_fields.join(', ')}`);
    });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
