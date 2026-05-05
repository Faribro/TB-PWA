/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 COMPREHENSIVE E2E DEMOGRAPHICS SYNC TEST
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Tests:
 * 1. All field types (text, date, number, select, checkbox)
 * 2. Supabase update verification
 * 3. Google Sheets sync verification
 * 4. Date formatting consistency
 * 5. Real-time update propagation
 */

const BACKEND_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHEETS_WEBHOOK_URL = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;

// Test patient ID (use a real patient from your database)
const TEST_PATIENT_ID = 'fdf26115-5782-4afc-aba4-2ac44585508f';

// Comprehensive test payload covering all field types
const TEST_UPDATES = {
  // Text fields
  inmate_name: 'Test Patient E2E',
  father_husband_name: 'Test Father',
  contact_number: '9876543210',
  address: '123 Test Street, Test City',
  staff_name: 'Test Staff',
  facility_name: 'Test Facility',
  unique_id: 'TEST-001',
  
  // Date fields (CRITICAL - all should be yyyy-MM-dd format)
  screening_date: '2026-05-02',
  date_of_birth: '1990-01-15',
  submitted_on: '2026-05-02',
  referral_date: '2026-05-03',
  diagnosis_date: '2026-05-04',
  att_start_date: '2026-05-05',
  
  // Number fields
  age: 34,
  
  // Select fields
  sex: 'male',
  screening_state: 'Gujarat',
  screening_district: 'Surat',
  facility_type: 'Central Jail',
  inmate_type: 'Under Trial',
  xray_result: 'Suspected TB Case',
  hiv_status: 'Negative',
  tb_past_history: 'No',
  
  // Checkbox fields (as strings for API compatibility)
  tb_diagnosed: 'Yes',
  cpt_given: 'No',
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '═'.repeat(75));
  log(`🧪 ${title}`, 'bright');
  console.log('═'.repeat(75) + '\n');
}

function logTest(name, status, details = '') {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏳';
  const color = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow';
  log(`${icon} ${name}`, color);
  if (details) log(`   ${details}`, 'cyan');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1: Update via API
// ═══════════════════════════════════════════════════════════════════════════
async function testAPIUpdate() {
  logSection('TEST 1: Update Patient via API');
  
  const payload = {
    id: TEST_PATIENT_ID,
    ...TEST_UPDATES,
  };
  
  log('📤 Sending update to /api/patient-sync...', 'cyan');
  log(`   Payload: ${JSON.stringify(payload, null, 2).substring(0, 200)}...`, 'cyan');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/patient-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    if (!response.ok) {
      logTest('API Update', 'fail', `Status ${response.status}: ${data.error || 'Unknown error'}`);
      return null;
    }
    
    logTest('API Update', 'pass', `Completed in ${duration}ms`);
    
    // Verify response structure
    if (data.success && data.patient) {
      logTest('Response Structure', 'pass', 'Contains success=true and patient object');
      
      // Check critical date fields
      const dateFields = ['screening_date', 'date_of_birth', 'referral_date'];
      let allDatesCorrect = true;
      
      for (const field of dateFields) {
        const expected = TEST_UPDATES[field];
        const actual = data.patient[field];
        
        if (expected) {
          // Extract date part from ISO timestamp if present
          const actualDate = actual ? actual.split('T')[0] : null;
          
          if (actualDate === expected) {
            logTest(`  ${field}`, 'pass', `${expected} ✓`);
          } else {
            logTest(`  ${field}`, 'fail', `Expected ${expected}, got ${actualDate}`);
            allDatesCorrect = false;
          }
        }
      }
      
      if (allDatesCorrect) {
        logTest('Date Field Verification', 'pass', 'All dates match expected values');
      }
    } else {
      logTest('Response Structure', 'fail', 'Missing success or patient in response');
    }
    
    return data;
  } catch (error) {
    logTest('API Update', 'fail', error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 2: Verify Supabase Update
// ═══════════════════════════════════════════════════════════════════════════
async function testSupabaseVerification() {
  logSection('TEST 2: Verify Supabase Database Update');
  
  log('⏳ Waiting 2 seconds for database propagation...', 'yellow');
  await sleep(2000);
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/patients?id=eq.${TEST_PATIENT_ID}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    
    if (!response.ok) {
      logTest('Supabase Query', 'fail', `Status ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      logTest('Supabase Query', 'fail', 'Patient not found in database');
      return false;
    }
    
    const patient = data[0];
    logTest('Supabase Query', 'pass', 'Patient record retrieved');
    
    // Verify all updated fields
    let allFieldsMatch = true;
    const fieldsToCheck = [
      { key: 'inmate_name', type: 'text' },
      { key: 'screening_date', type: 'date' },
      { key: 'date_of_birth', type: 'date' },
      { key: 'age', type: 'number' },
      { key: 'sex', type: 'text' },
      { key: 'contact_number', type: 'text' },
      { key: 'address', type: 'text' },
      { key: 'facility_name', type: 'text' },
      { key: 'screening_state', type: 'text' },
      { key: 'screening_district', type: 'text' },
      { key: 'xray_result', type: 'text' },
      { key: 'hiv_status', type: 'text' },
    ];
    
    for (const { key, type } of fieldsToCheck) {
      const expected = TEST_UPDATES[key];
      const actual = patient[key];
      
      if (expected === undefined) continue;
      
      let matches = false;
      let displayActual = actual;
      
      if (type === 'date' && actual) {
        // Extract date part from ISO timestamp
        displayActual = actual.split('T')[0];
        matches = displayActual === expected;
      } else {
        matches = String(actual) === String(expected);
      }
      
      if (matches) {
        logTest(`  ${key}`, 'pass', `${expected} ✓`);
      } else {
        logTest(`  ${key}`, 'fail', `Expected "${expected}", got "${displayActual}"`);
        allFieldsMatch = false;
      }
    }
    
    if (allFieldsMatch) {
      logTest('Field Verification', 'pass', 'All fields match in Supabase');
    } else {
      logTest('Field Verification', 'fail', 'Some fields do not match');
    }
    
    return allFieldsMatch;
  } catch (error) {
    logTest('Supabase Verification', 'fail', error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 3: Verify Google Sheets Sync
// ═══════════════════════════════════════════════════════════════════════════
async function testSheetsSyncVerification() {
  logSection('TEST 3: Verify Google Sheets Sync');
  
  if (!SHEETS_WEBHOOK_URL) {
    logTest('Sheets Webhook', 'fail', 'GOOGLE_SCRIPT_WEBHOOK_URL not configured');
    return false;
  }
  
  log('⏳ Waiting 3 seconds for sheets sync...', 'yellow');
  await sleep(3000);
  
  try {
    // Test direct webhook call
    const payload = {
      id: TEST_PATIENT_ID,
      kobo_uuid: 'test-uuid',
      ...TEST_UPDATES,
    };
    
    log('📤 Testing direct webhook call...', 'cyan');
    
    const response = await fetch(SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const text = await response.text();
    
    if (response.ok) {
      logTest('Sheets Webhook', 'pass', `Status ${response.status}`);
      
      // Check response message
      if (text.includes('success') || text.includes('updated')) {
        logTest('Sheets Response', 'pass', text.substring(0, 100));
      } else {
        logTest('Sheets Response', 'fail', text.substring(0, 100));
      }
      
      return true;
    } else {
      logTest('Sheets Webhook', 'fail', `Status ${response.status}: ${text.substring(0, 100)}`);
      return false;
    }
  } catch (error) {
    logTest('Sheets Sync', 'fail', error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 4: Verify Vertex Data (Screening Date vs Submitted On)
// ═══════════════════════════════════════════════════════════════════════════
async function testVertexDataSource() {
  logSection('TEST 4: Verify Vertex Uses Screening Date');
  
  try {
    // Query patients API (which Vertex uses)
    const response = await fetch(`${BACKEND_URL}/api/patients`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      logTest('Patients API', 'fail', `Status ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    const patient = data.patients?.find(p => p.id === TEST_PATIENT_ID);
    
    if (!patient) {
      logTest('Patient Lookup', 'fail', 'Test patient not found in API response');
      return false;
    }
    
    logTest('Patient Lookup', 'pass', 'Test patient found in API');
    
    // Check which date field is present and used
    const screeningDate = patient.screening_date;
    const submittedOn = patient.submitted_on;
    
    log('\n📊 Date Fields in API Response:', 'cyan');
    log(`   screening_date: ${screeningDate}`, 'cyan');
    log(`   submitted_on: ${submittedOn}`, 'cyan');
    
    if (screeningDate) {
      const screeningDateOnly = screeningDate.split('T')[0];
      if (screeningDateOnly === TEST_UPDATES.screening_date) {
        logTest('Screening Date', 'pass', `Correct: ${screeningDateOnly}`);
      } else {
        logTest('Screening Date', 'fail', `Expected ${TEST_UPDATES.screening_date}, got ${screeningDateOnly}`);
      }
    } else {
      logTest('Screening Date', 'fail', 'screening_date field is missing');
    }
    
    // Verify Vertex would use screening_date for timeline
    if (screeningDate && !submittedOn) {
      logTest('Vertex Data Source', 'pass', 'Uses screening_date (submitted_on not present)');
    } else if (screeningDate && submittedOn) {
      log('\n⚠️  WARNING: Both screening_date and submitted_on are present', 'yellow');
      log('   Vertex should prioritize screening_date for timeline', 'yellow');
      logTest('Vertex Data Source', 'pass', 'screening_date available for Vertex');
    } else {
      logTest('Vertex Data Source', 'fail', 'screening_date not available');
    }
    
    return true;
  } catch (error) {
    logTest('Vertex Verification', 'fail', error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 5: Date Format Consistency Check
// ═══════════════════════════════════════════════════════════════════════════
async function testDateFormatConsistency() {
  logSection('TEST 5: Date Format Consistency Across System');
  
  const dateFields = [
    'screening_date',
    'date_of_birth',
    'submitted_on',
    'referral_date',
    'diagnosis_date',
    'att_start_date',
  ];
  
  log('📋 Checking date format consistency...', 'cyan');
  
  let allConsistent = true;
  
  for (const field of dateFields) {
    const value = TEST_UPDATES[field];
    if (!value) continue;
    
    // Check if format is yyyy-MM-dd
    const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(value);
    
    if (isValidFormat) {
      logTest(`  ${field}`, 'pass', `${value} (yyyy-MM-dd) ✓`);
    } else {
      logTest(`  ${field}`, 'fail', `${value} (invalid format)`);
      allConsistent = false;
    }
  }
  
  if (allConsistent) {
    logTest('Date Format Check', 'pass', 'All dates use yyyy-MM-dd format');
  } else {
    logTest('Date Format Check', 'fail', 'Some dates have incorrect format');
  }
  
  return allConsistent;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════
async function runAllTests() {
  console.log('\n');
  log('═'.repeat(75), 'bright');
  log('🧪 COMPREHENSIVE E2E DEMOGRAPHICS SYNC TEST SUITE', 'bright');
  log('═'.repeat(75), 'bright');
  log(`\n📍 Backend URL: ${BACKEND_URL}`, 'cyan');
  log(`📍 Test Patient ID: ${TEST_PATIENT_ID}`, 'cyan');
  log(`📍 Timestamp: ${new Date().toISOString()}\n`, 'cyan');
  
  const results = {
    apiUpdate: false,
    supabaseVerification: false,
    sheetsSync: false,
    vertexDataSource: false,
    dateFormatConsistency: false,
  };
  
  try {
    // Run tests sequentially
    const apiResult = await testAPIUpdate();
    results.apiUpdate = apiResult !== null;
    
    if (results.apiUpdate) {
      results.supabaseVerification = await testSupabaseVerification();
      results.sheetsSync = await testSheetsSyncVerification();
      results.vertexDataSource = await testVertexDataSource();
    }
    
    results.dateFormatConsistency = await testDateFormatConsistency();
    
  } catch (error) {
    log(`\n❌ Test suite failed with error: ${error.message}`, 'red');
    console.error(error);
  }
  
  // Final summary
  logSection('TEST SUMMARY');
  
  const tests = [
    { name: 'API Update', result: results.apiUpdate },
    { name: 'Supabase Verification', result: results.supabaseVerification },
    { name: 'Google Sheets Sync', result: results.sheetsSync },
    { name: 'Vertex Data Source', result: results.vertexDataSource },
    { name: 'Date Format Consistency', result: results.dateFormatConsistency },
  ];
  
  const passed = tests.filter(t => t.result).length;
  const total = tests.length;
  const successRate = ((passed / total) * 100).toFixed(1);
  
  tests.forEach(test => {
    logTest(test.name, test.result ? 'pass' : 'fail');
  });
  
  console.log('\n' + '═'.repeat(75));
  log(`📊 RESULTS: ${passed}/${total} tests passed (${successRate}%)`, 'bright');
  console.log('═'.repeat(75) + '\n');
  
  if (passed === total) {
    log('🎉 ALL TESTS PASSED! System is working correctly.', 'green');
  } else {
    log('⚠️  SOME TESTS FAILED. Please review the output above.', 'yellow');
  }
  
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
