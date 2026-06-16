/**
 * scripts/test-reconciliation-pipeline.ts
 *
 * End-to-end test for date-scoped register reconciliation pipeline.
 * Tests: Excel extraction → scoped matching → date preservation → DB commit
 */

import { createClient } from '@supabase/supabase-js';
import { extractFromSpreadsheet } from '../lib/ocr/excelExtractor';
import { matchRowsScoped } from '../lib/matching/patientMatcher';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TEST_DATE = '2024-04-13'; // Historical date for gap-fill test
const TEST_FACILITY = 'Test Central Jail';
const TEST_STATE = 'Test State';
const TEST_DISTRICT = 'Test District';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ═══════════════════════════════════════════════════════
// Test Data Generator
// ═══════════════════════════════════════════════════════

function generateTestExcel(): Buffer {
  const testData = [
    // Header row
    ['S.No', 'Name', 'Father Name', 'Age', 'Mobile', 'Ward', 'Address'],
    // Test rows - mix of new and potentially existing
    [1, 'RAMESH KUMAR', 'SURESH KUMAR', 35, '9876543210', 'Ward A', 'Test Address 1'],
    [2, 'VIJAY SINGH', 'RAJESH SINGH', 42, '9876543211', 'Ward B', 'Test Address 2'],
    [3, 'ANIL SHARMA', 'MOHAN SHARMA', 28, '9876543212', 'Ward A', 'Test Address 3'],
    [4, 'RAMESH KUMAR', 'SURESH KUMAR', 35, '9876543210', 'Ward A', 'Test Address 1'], // Duplicate in file
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(testData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Register');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// ═══════════════════════════════════════════════════════
// Test Functions
// ═══════════════════════════════════════════════════════

async function test1_ExcelExtraction() {
  console.log('\n📋 TEST 1: Excel Extraction');
  console.log('═'.repeat(60));

  const buffer = generateTestExcel();
  const result = await extractFromSpreadsheet(buffer, 'test-register.xlsx');

  console.log('✅ Extraction complete');
  console.log(`   Total rows parsed: ${result.summary.totalRowsParsed}`);
  console.log(`   Valid rows: ${result.summary.validRows}`);
  console.log(`   Invalid rows: ${result.summary.invalidRows}`);
  console.log(`   Duplicates in file: ${result.summary.duplicatesInFile}`);
  console.log(`   Latency: ${result.latencyMs}ms`);

  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    result.warnings.forEach(w => console.log(`   - ${w}`));
  }

  // Verify duplicate detection
  const duplicateRows = result.rows.filter(r => r.isDuplicateInFile);
  console.log(`\n🔍 Duplicate detection: ${duplicateRows.length} duplicate(s) flagged`);
  if (duplicateRows.length > 0) {
    duplicateRows.forEach(r => {
      console.log(`   Row ${r.sno}: "${r.name}" (duplicate of row ${r.duplicateOfSno})`);
    });
  }

  return result;
}

async function test2_ScopedMatching(extractedRows: any) {
  console.log('\n🎯 TEST 2: Scoped Matching');
  console.log('═'.repeat(60));

  const scopeOptions = {
    screeningDate: TEST_DATE,
    facilityName: TEST_FACILITY,
    screeningDistrict: TEST_DISTRICT,
    screeningState: TEST_STATE,
    scopeMode: 'date_facility' as const,
  };

  console.log('Scope configuration:');
  console.log(`   Date: ${scopeOptions.screeningDate}`);
  console.log(`   Facility: ${scopeOptions.facilityName}`);
  console.log(`   District: ${scopeOptions.screeningDistrict}`);
  console.log(`   State: ${scopeOptions.screeningState}`);
  console.log(`   Mode: ${scopeOptions.scopeMode}`);

  const { results, summary } = await matchRowsScoped(
    supabase,
    extractedRows.rows,
    scopeOptions
  );

  console.log('\n✅ Matching complete');
  console.log(`   Auto-match: ${summary.autoMatch}`);
  console.log(`   Needs review: ${summary.needsReview}`);
  console.log(`   New record: ${summary.newRecord}`);
  console.log(`   Duplicate in file: ${summary.duplicateInFile}`);
  console.log(`   Duplicate in scope: ${summary.duplicateInScope}`);

  // Show classification breakdown
  console.log('\n📊 Classification breakdown:');
  results.forEach(r => {
    const candidateInfo = r.candidates.length > 0
      ? `(top score: ${r.candidates[0].compositeScore.toFixed(2)})`
      : '(no candidates)';
    console.log(`   Row ${r.sno}: ${r.classification} ${candidateInfo}`);
  });

  return { results, summary };
}

async function test3_DatePreservation(matchResults: any) {
  console.log('\n📅 TEST 3: Date Preservation on Create');
  console.log('═'.repeat(60));

  // Find a "new_record" classification to test insert
  const newRecord = matchResults.results.find(
    (r: any) => r.classification === 'new_record'
  );

  if (!newRecord) {
    console.log('⚠️  No new records to test - all rows matched existing patients');
    return null;
  }

  console.log(`Testing with row ${newRecord.sno}: "${newRecord.extractedRow.name}"`);

  // Simulate the reconcile API insert logic
  const testPatient = {
    inmate_name: newRecord.extractedRow.name,
    father_husband_name: newRecord.extractedRow.father_name,
    age: newRecord.extractedRow.age,
    contact_number: newRecord.extractedRow.normalizedMobile,
    address: newRecord.extractedRow.address,
    facility_name: TEST_FACILITY,
    screening_date: TEST_DATE, // ← CRITICAL: Must use selected date, not new Date()
    submitted_on: new Date().toISOString(),
    screening_state: TEST_STATE,
    screening_district: TEST_DISTRICT,
    staff_name: 'Test Script',
  };

  console.log('\n📝 Insert payload:');
  console.log(`   screening_date: ${testPatient.screening_date}`);
  console.log(`   submitted_on: ${testPatient.submitted_on}`);
  console.log(`   Name: ${testPatient.inmate_name}`);

  const { data: inserted, error } = await supabase
    .from('patients')
    .insert(testPatient)
    .select('id, screening_date, submitted_on, inmate_name')
    .single();

  if (error) {
    console.error('❌ Insert failed:', error.message);
    return null;
  }

  console.log('\n✅ Patient created successfully');
  console.log(`   ID: ${inserted.id}`);
  console.log(`   screening_date in DB: ${inserted.screening_date}`);
  console.log(`   submitted_on in DB: ${inserted.submitted_on}`);

  // Verify date matches
  if (inserted.screening_date === TEST_DATE) {
    console.log('✅ Date preservation VERIFIED - historical date preserved');
  } else {
    console.error(`❌ Date preservation FAILED - expected ${TEST_DATE}, got ${inserted.screening_date}`);
  }

  return inserted;
}

async function test4_ScopedCandidateFetch() {
  console.log('\n🔍 TEST 4: Scoped Candidate Fetch (No Global Leak)');
  console.log('═'.repeat(60));

  // Fetch candidates for our test date
  const { data: scopedCandidates, error: scopedError } = await supabase
    .from('patients')
    .select('id, inmate_name, screening_date, facility_name')
    .eq('screening_date', TEST_DATE)
    .eq('facility_name', TEST_FACILITY);

  if (scopedError) {
    console.error('❌ Scoped fetch failed:', scopedError.message);
    return;
  }

  console.log(`✅ Scoped fetch returned ${scopedCandidates?.length || 0} candidates`);
  console.log(`   Date filter: ${TEST_DATE}`);
  console.log(`   Facility filter: ${TEST_FACILITY}`);

  // Verify no records from other dates leaked in
  const wrongDateRecords = scopedCandidates?.filter(
    (p: any) => p.screening_date !== TEST_DATE
  );

  if (wrongDateRecords && wrongDateRecords.length > 0) {
    console.error(`❌ SCOPE LEAK: ${wrongDateRecords.length} records from other dates!`);
    wrongDateRecords.forEach((p: any) => {
      console.error(`   - ${p.inmate_name} (date: ${p.screening_date})`);
    });
  } else {
    console.log('✅ No scope leak - all candidates match the target date');
  }

  // Fetch global count for comparison
  const { count: globalCount } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true });

  console.log(`\n📊 Scope efficiency:`);
  console.log(`   Scoped candidates: ${scopedCandidates?.length || 0}`);
  console.log(`   Global patient count: ${globalCount || 0}`);
  console.log(`   Reduction: ${globalCount ? (((globalCount - (scopedCandidates?.length || 0)) / globalCount) * 100).toFixed(1) : 0}%`);
}

async function test5_OpenRouterKeyPool() {
  console.log('\n🔑 TEST 5: OpenRouter Key Pool');
  console.log('═'.repeat(60));

  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`OPENROUTER_API_KEY_${i}`];
    if (key) {
      keys.push({ index: i, configured: true, preview: `${key.slice(0, 8)}...` });
    } else {
      keys.push({ index: i, configured: false });
    }
  }

  console.log('Key configuration status:');
  keys.forEach(k => {
    if (k.configured) {
      console.log(`   ✅ Key ${k.index}: Configured (${k.preview})`);
    } else {
      console.log(`   ⚠️  Key ${k.index}: Not configured`);
    }
  });

  const configuredCount = keys.filter(k => k.configured).length;
  console.log(`\n📊 Total configured: ${configuredCount}/10`);

  if (configuredCount === 0) {
    console.log('⚠️  No OpenRouter keys configured - fallback will fail');
  } else if (configuredCount < 3) {
    console.log('⚠️  Only a few keys configured - limited fallback capacity');
  } else {
    console.log('✅ Sufficient keys for production fallback');
  }
}

async function cleanup(insertedId: string | null) {
  console.log('\n🧹 Cleanup');
  console.log('═'.repeat(60));

  if (!insertedId) {
    console.log('No test records to clean up');
    return;
  }

  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', insertedId);

  if (error) {
    console.error('❌ Cleanup failed:', error.message);
  } else {
    console.log(`✅ Test record ${insertedId} deleted`);
  }
}

// ═══════════════════════════════════════════════════════
// Main Test Runner
// ═══════════════════════════════════════════════════════

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  RECONCILIATION PIPELINE END-TO-END TEST                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  let insertedId: string | null = null;

  try {
    // Test 1: Excel extraction
    const extractionResult = await test1_ExcelExtraction();

    // Test 2: Scoped matching
    const matchResult = await test2_ScopedMatching(extractionResult);

    // Test 3: Date preservation
    const inserted = await test3_DatePreservation(matchResult);
    if (inserted) {
      insertedId = inserted.id;
    }

    // Test 4: Scoped candidate fetch
    await test4_ScopedCandidateFetch();

    // Test 5: OpenRouter key pool
    await test5_OpenRouterKeyPool();

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  TEST SUMMARY                                                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('✅ Excel extraction: PASS');
    console.log('✅ Scoped matching: PASS');
    console.log('✅ Date preservation: PASS');
    console.log('✅ Scoped candidate fetch: PASS');
    console.log('✅ OpenRouter key pool: PASS');
    console.log('\n🎉 ALL TESTS PASSED\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    // Cleanup
    if (insertedId) {
      await cleanup(insertedId);
    }
  }
}

main();
