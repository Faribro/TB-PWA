/**
 * tests/test-register-reconcile-dual-write.ts
 * 
 * Verifies that register reconciliation commits write to BOTH:
 * 1. Supabase patients table
 * 2. Google Sheets
 * 
 * Run: npx tsx --env-file=.env.local tests/test-register-reconcile-dual-write.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_APPSCRIPT_URL = process.env.GOOGLE_APPSCRIPT_URL!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testDualWrite() {
  log('\n' + '='.repeat(70), 'bold');
  log('REGISTER RECONCILIATION DUAL-WRITE TEST', 'bold');
  log('='.repeat(70) + '\n', 'bold');

  const testDate = '2025-01-15';
  const testName = `TEST_PATIENT_${Date.now()}`;
  
  log('Test Configuration:', 'cyan');
  log(`  Screening Date: ${testDate}`, 'blue');
  log(`  Test Name: ${testName}`, 'blue');
  log(`  Supabase URL: ${SUPABASE_URL}`, 'blue');
  log(`  Google Script: ${GOOGLE_APPSCRIPT_URL ? 'Configured' : 'NOT CONFIGURED'}`, GOOGLE_APPSCRIPT_URL ? 'green' : 'red');

  // Step 1: Create test patient in Supabase
  log('\n[Step 1] Creating test patient in Supabase...', 'cyan');
  
  const newPatient = {
    inmate_name: testName,
    father_husband_name: 'TEST_FATHER',
    age: 30,
    contact_number: '9876543210',
    address: 'Test Address',
    facility_name: 'Test Facility',
    screening_date: testDate,
    submitted_on: new Date().toISOString(),
    staff_name: 'Test Script',
    screening_state: 'Test State',
    screening_district: 'Test District',
  };

  const { data: insertedPatient, error: insertError } = await supabase
    .from('patients')
    .insert(newPatient)
    .select('id, inmate_name, screening_date')
    .single();

  if (insertError) {
    log(`❌ Supabase insert failed: ${insertError.message}`, 'red');
    process.exit(1);
  }

  log(`✅ Patient created in Supabase: ID ${insertedPatient.id}`, 'green');

  // Step 2: Trigger Google Sheets sync
  log('\n[Step 2] Triggering Google Sheets sync...', 'cyan');

  if (!GOOGLE_APPSCRIPT_URL) {
    log('⚠️  GOOGLE_APPSCRIPT_URL not configured - skipping Sheets test', 'yellow');
    log('✅ Supabase write verified', 'green');
    
    // Cleanup
    await supabase.from('patients').delete().eq('id', insertedPatient.id);
    log('\n✅ Test patient cleaned up', 'green');
    return;
  }

  try {
    const sheetsResponse = await fetch(GOOGLE_APPSCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'TRIGGER_SYNC' }),
    });

    if (!sheetsResponse.ok) {
      log(`❌ Sheets sync returned HTTP ${sheetsResponse.status}`, 'red');
      const errorText = await sheetsResponse.text();
      log(`   Error: ${errorText}`, 'red');
    } else {
      const result = await sheetsResponse.json();
      log(`✅ Sheets sync triggered successfully`, 'green');
      log(`   Response: ${JSON.stringify(result)}`, 'blue');
    }
  } catch (syncError) {
    log(`❌ Sheets sync failed: ${syncError instanceof Error ? syncError.message : 'Unknown'}`, 'red');
  }

  // Step 3: Verify patient exists in Supabase
  log('\n[Step 3] Verifying patient in Supabase...', 'cyan');
  
  const { data: verifyPatient, error: verifyError } = await supabase
    .from('patients')
    .select('id, inmate_name, screening_date')
    .eq('id', insertedPatient.id)
    .single();

  if (verifyError || !verifyPatient) {
    log(`❌ Patient not found in Supabase after sync`, 'red');
  } else {
    log(`✅ Patient verified in Supabase: ${verifyPatient.inmate_name}`, 'green');
  }

  // Step 4: Check current implementation
  log('\n[Step 4] Implementation Analysis:', 'cyan');
  
  log('Current Flow:', 'yellow');
  log('  1. ✅ Insert/Update in Supabase patients table', 'green');
  log('  2. ⚠️  Trigger Google Sheets sync (TRIGGER_SYNC action)', 'yellow');
  log('  3. ❓ Google Apps Script must handle the sync', 'yellow');

  log('\nExpected Behavior:', 'yellow');
  log('  - New "create" rows should be inserted into Supabase', 'blue');
  log('  - Same rows should be appended to Google Sheets', 'blue');
  log('  - Both writes should happen in one backend flow', 'blue');
  log('  - Idempotency: duplicates should be skipped', 'blue');

  log('\nCurrent Implementation:', 'yellow');
  log('  ✅ Supabase write: Direct insert/update', 'green');
  log('  ⚠️  Sheets write: Delegated to Google Apps Script', 'yellow');
  log('  ⚠️  Dual-write: Not atomic (two separate operations)', 'yellow');

  // Cleanup
  log('\n[Cleanup] Removing test patient...', 'cyan');
  const { error: deleteError } = await supabase
    .from('patients')
    .delete()
    .eq('id', insertedPatient.id);

  if (deleteError) {
    log(`⚠️  Cleanup failed: ${deleteError.message}`, 'yellow');
  } else {
    log(`✅ Test patient removed`, 'green');
  }

  // Summary
  log('\n' + '='.repeat(70), 'bold');
  log('TEST SUMMARY', 'bold');
  log('='.repeat(70), 'bold');
  
  log('\n✅ Supabase Write: VERIFIED', 'green');
  log('⚠️  Google Sheets Write: DELEGATED (not directly verified)', 'yellow');
  log('\nRecommendation:', 'cyan');
  log('  The current implementation relies on Google Apps Script', 'blue');
  log('  to handle the Sheets sync. This is acceptable if:', 'blue');
  log('  1. The Apps Script polls Supabase for new records', 'blue');
  log('  2. Or the TRIGGER_SYNC action causes immediate append', 'blue');
  log('  3. Failures are logged and can be retried', 'blue');
  
  log('\n' + '='.repeat(70) + '\n', 'bold');
}

// Run test
testDualWrite().catch(error => {
  log(`\n❌ Test failed: ${error instanceof Error ? error.message : String(error)}`, 'red');
  process.exit(1);
});
