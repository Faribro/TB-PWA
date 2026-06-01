/**
 * scripts/test-clinical-null-records-scan.ts
 *
 * Scans all real patients and reports:
 * - how many have only hiv_status populated
 * - how many have diagnosis/treatment fields null
 * - pattern by creation date / update date
 * - whether updated_at changes without clinical columns changing
 *
 * Run: bun run scripts/test-clinical-null-records-scan.ts
 */

import { getSupabaseClient } from '../lib/supabase-server';
import fs from 'fs';
import path from 'path';

const CLINICAL_FIELDS = [
  'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
  'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status',
  'art_status', 'art_number', 'nikshay_abha_id', 'registration_date',
  'remarks', 'other_facility_name'
];

const DATE_FIELDS = ['referral_date', 'tb_diagnosis_date', 'att_start_date', 'att_completion_date', 'registration_date'];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 NULL RECORDS SCAN — REAL PATIENT DATABASE');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const supabase = getSupabaseClient();

  // Fetch all patients with clinical + metadata fields
  const { data: patients, error } = await supabase
    .from('patients')
    .select(`id, kobo_uuid, inmate_name, created_at, updated_at, ${CLINICAL_FIELDS.join(',')}`)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error || !patients) {
    console.error('❌ Failed to fetch patients:', error);
    process.exit(1);
  }

  console.log(`📊 Scanning ${patients.length} patients...\n`);

  // ─── Categorize each patient ───────────────────────────────────────────────
  const stats = {
    total: patients.length,
    all_clinical_null: 0,
    only_hiv_status: 0,
    has_referral_date: 0,
    has_tb_diagnosed: 0,
    has_att_start: 0,
    has_nikshay: 0,
    fully_complete: 0,
    updated_without_clinical: 0,
    partial_saves_suspected: 0
  };

  const byScore: Record<number, number> = {};
  const nullifiedPatterns: any[] = [];
  const updatedWithoutClinical: any[] = [];

  patients.forEach(p => {
    const clinicalScore = CLINICAL_FIELDS.filter(f => {
      const v = (p as any)[f];
      return v !== null && v !== undefined && v !== '';
    }).length;

    byScore[clinicalScore] = (byScore[clinicalScore] || 0) + 1;

    if (clinicalScore === 0) stats.all_clinical_null++;
    if (clinicalScore === 1 && (p as any).hiv_status) stats.only_hiv_status++;
    if ((p as any).referral_date) stats.has_referral_date++;
    if ((p as any).tb_diagnosed) stats.has_tb_diagnosed++;
    if ((p as any).att_start_date) stats.has_att_start++;
    if ((p as any).nikshay_abha_id) stats.has_nikshay++;
    if (clinicalScore === CLINICAL_FIELDS.length) stats.fully_complete++;

    // Detect: updated_at is NEWER than created_at but all clinical fields are null
    // This means a save happened but wrote nothing meaningful
    const createdAt = new Date(p.created_at || 0);
    const updatedAt = new Date(p.updated_at || 0);
    const wasUpdated = updatedAt.getTime() - createdAt.getTime() > 5000; // >5s gap

    if (wasUpdated && clinicalScore === 0) {
      stats.updated_without_clinical++;
      updatedWithoutClinical.push({
        id: p.id,
        inmate_name: p.inmate_name,
        created_at: p.created_at,
        updated_at: p.updated_at,
        gap_seconds: Math.round((updatedAt.getTime() - createdAt.getTime()) / 1000),
        clinical_score: clinicalScore
      });
    }

    // Detect: has hiv_status but all date fields are null
    // Pattern: user saved with only hiv_status, date fields got nullified
    const hasHiv = !!(p as any).hiv_status;
    const allDatesNull = DATE_FIELDS.every(f => !(p as any)[f]);
    if (hasHiv && allDatesNull && clinicalScore <= 2) {
      stats.partial_saves_suspected++;
    }
  });

  // ─── Print results ─────────────────────────────────────────────────────────
  console.log('📊 CLINICAL COMPLETENESS DISTRIBUTION:\n');
  console.log('  Score | Count | % of total');
  console.log('  ' + '─'.repeat(35));
  for (let i = 0; i <= CLINICAL_FIELDS.length; i++) {
    const count = byScore[i] || 0;
    if (count === 0) continue;
    const pct = ((count / patients.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / patients.length * 30));
    console.log(`  ${String(i).padStart(5)} | ${String(count).padStart(5)} | ${pct.padStart(5)}% ${bar}`);
  }

  console.log('\n📊 KEY STATISTICS:\n');
  console.log(`  Total patients scanned:          ${stats.total}`);
  console.log(`  All clinical fields null:         ${stats.all_clinical_null} (${((stats.all_clinical_null/stats.total)*100).toFixed(1)}%)`);
  console.log(`  Only hiv_status populated:        ${stats.only_hiv_status}`);
  console.log(`  Has referral_date:                ${stats.has_referral_date}`);
  console.log(`  Has tb_diagnosed:                 ${stats.has_tb_diagnosed}`);
  console.log(`  Has att_start_date:               ${stats.has_att_start}`);
  console.log(`  Has nikshay_abha_id:              ${stats.has_nikshay}`);
  console.log(`  Fully complete (14/14):           ${stats.fully_complete}`);
  console.log(`  Updated but 0 clinical fields:    ${stats.updated_without_clinical} ← SUSPICIOUS`);
  console.log(`  Partial save suspected:           ${stats.partial_saves_suspected} ← hiv_status only, dates null`);

  if (updatedWithoutClinical.length > 0) {
    console.log('\n🔴 PATIENTS UPDATED BUT ZERO CLINICAL DATA (sample of 10):\n');
    updatedWithoutClinical.slice(0, 10).forEach(p => {
      console.log(`  ${p.inmate_name?.padEnd(25)} | gap: ${p.gap_seconds}s | created: ${p.created_at?.substring(0,10)} | updated: ${p.updated_at?.substring(0,10)}`);
    });
  }

  // ─── Date pattern analysis ─────────────────────────────────────────────────
  console.log('\n📅 CREATION DATE PATTERN (clinical score by month):\n');
  const byMonth: Record<string, { total: number; withClinical: number }> = {};
  patients.forEach(p => {
    const month = (p.created_at || '').substring(0, 7);
    if (!byMonth[month]) byMonth[month] = { total: 0, withClinical: 0 };
    byMonth[month].total++;
    const score = CLINICAL_FIELDS.filter(f => (p as any)[f]).length;
    if (score > 0) byMonth[month].withClinical++;
  });

  Object.entries(byMonth).sort().forEach(([month, data]) => {
    const pct = ((data.withClinical / data.total) * 100).toFixed(0);
    console.log(`  ${month} | ${String(data.total).padStart(4)} patients | ${String(data.withClinical).padStart(4)} with clinical data (${pct}%)`);
  });

  // ─── Save output ──────────────────────────────────────────────────────────
  const output = {
    scanned: patients.length,
    stats,
    score_distribution: byScore,
    updated_without_clinical: updatedWithoutClinical,
    by_month: byMonth,
    verdict: {
      primary: `${stats.all_clinical_null} patients (${((stats.all_clinical_null/stats.total)*100).toFixed(1)}%) have ZERO clinical data`,
      suspicious: `${stats.updated_without_clinical} patients were updated but still have zero clinical fields`,
      pattern: stats.only_hiv_status > 0
        ? `${stats.only_hiv_status} patients have ONLY hiv_status — consistent with partial save overwriting date fields with null`
        : 'No hiv_status-only pattern detected'
    }
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'tmp', 'clinical-null-records-scan.json'),
    JSON.stringify(output, null, 2)
  );

  console.log('\n✅ Saved to: tmp/clinical-null-records-scan.json');
}

main().catch(e => { console.error(e); process.exit(1); });
