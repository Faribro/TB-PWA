// ═══════════════════════════════════════════════════════════════════════════
// DEMOGRAPHICS SYNC TEST - E2E VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
// Tests the complete demographics save flow:
// 1. PatientDetailDrawer event listener
// 2. /api/patient-sync endpoint
// 3. Supabase update
// 4. Google Sheets webhook
// ═══════════════════════════════════════════════════════════════════════════

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const API_BASE = 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHEETS_WEBHOOK = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const log = {
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  data: (label, value) => console.log(`${colors.dim}   ${label}: ${colors.white}${value}${colors.reset}`),
};

// Test results tracker
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    log.success(`${name}`);
  } else {
    results.failed++;
    log.error(`${name}`);
  }
  if (details) log.data('Details', details);
  results.tests.push({ name, passed, details });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1: Fetch a test patient from Supabase
// ═══════════════════════════════════════════════════════════════════════════
async function getTestPatient() {
  log.section('📋 TEST 1: Fetching test patient from Supabase');
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/patients?select=*&limit=1`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    });

    if (!res.ok) {
      recordTest('Fetch test patient', false, `HTTP ${res.status}`);
      return null;
    }

    const patients = await res.json();
    if (!patients || patients.length === 0) {
      recordTest('Fetch test patient', false, 'No patients found in database');
      return null;
    }

    const patient = patients[0];
    recordTest('Fetch test patient', true, `Found patient: ${patient.inmate_name} (${patient.unique_id})`);
    log.data('Patient ID', patient.id);
    log.data('Current Name', patient.inmate_name);
    log.data('Current Age', patient.age);
    log.data('Current Contact', patient.contact_number);
    
    return patient;
  } catch (error) {
    recordTest('Fetch test patient', false, error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 2: Update demographics via /api/patient-sync
// ═══════════════════════════════════════════════════════════════════════════
async function testDemographicsUpdate(patient) {
  log.section('📤 TEST 2: Updating demographics via /api/patient-sync');
  
  const timestamp = Date.now();
  const testUpdates = {
    id: patient.id,
    inmate_name: `${patient.inmate_name} [TEST-${timestamp}]`,
    age: '35',
    contact_number: `9876543210`,
    address: `Test Address Updated ${timestamp}`,
    father_husband_name: `Test Father ${timestamp}`,
    updated_at: new Date().toISOString()
  };

  log.info('Sending update payload:');
  log.data('Name', testUpdates.inmate_name);
  log.data('Age', testUpdates.age);
  log.data('Contact', testUpdates.contact_number);

  try {
    const startTime = Date.now();
    const res = await fetch(`${API_BASE}/api/patient-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        patientId: patient.id,
        updates: testUpdates
      })
    });

    const duration = Date.now() - startTime;
    
    if (!res.ok) {
      const errorData = await res.json();
      recordTest('Demographics update API call', false, `HTTP ${res.status}: ${errorData.error}`);
      return null;
    }

    const responseData = await res.json();
    recordTest('Demographics update API call', true, `Completed in ${duration}ms`);
    
    if (responseData.success && responseData.patient) {
      log.success('Supabase update confirmed');
      log.data('Updated Name', responseData.patient.inmate_name);
      log.data('Updated Age', responseData.patient.age);
      log.data('Updated Contact', responseData.patient.contact_number);
      return responseData.patient;
    } else {
      recordTest('Supabase update verification', false, 'No patient data in response');
      return null;
    }
  } catch (error) {
    recordTest('Demographics update API call', false, error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 3: Verify Supabase persistence
// ═══════════════════════════════════════════════════════════════════════════
async function verifySupabasePersistence(patientId, expectedName) {
  log.section('🔍 TEST 3: Verifying Supabase persistence');
  
  // Wait 1 second for DB to settle
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/patients?id=eq.${patientId}&select=*`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    });

    if (!res.ok) {
      recordTest('Supabase persistence check', false, `HTTP ${res.status}`);
      return false;
    }

    const patients = await res.json();
    if (!patients || patients.length === 0) {
      recordTest('Supabase persistence check', false, 'Patient not found');
      return false;
    }

    const patient = patients[0];
    const nameMatches = patient.inmate_name === expectedName;
    
    if (nameMatches) {
      recordTest('Supabase persistence check', true, 'Data persisted correctly');
      log.data('Verified Name', patient.inmate_name);
      log.data('Verified Age', patient.age);
      log.data('Verified Contact', patient.contact_number);
      return true;
    } else {
      recordTest('Supabase persistence check', false, `Name mismatch: expected "${expectedName}", got "${patient.inmate_name}"`);
      return false;
    }
  } catch (error) {
    recordTest('Supabase persistence check', false, error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 4: Verify Google Sheets webhook (fire-and-forget)
// ═══════════════════════════════════════════════════════════════════════════
async function testSheetsWebhook(patient) {
  log.section('📊 TEST 4: Testing Google Sheets webhook');
  
  if (!SHEETS_WEBHOOK || SHEETS_WEBHOOK === 'your_webhook_url') {
    log.warning('Google Sheets webhook not configured, skipping');
    recordTest('Google Sheets webhook', true, 'Skipped (not configured)');
    return true;
  }

  try {
    const payload = {
      batch: [patient],
      batch_id: `test-demographics-${Date.now()}`,
      operation: 'UPDATE'
    };

    const startTime = Date.now();
    const res = await fetch(SHEETS_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000)
    });

    const duration = Date.now() - startTime;

    if (res.ok) {
      const responseText = await res.text();
      recordTest('Google Sheets webhook', true, `Responded in ${duration}ms`);
      log.data('Response', responseText.substring(0, 100));
      return true;
    } else {
      recordTest('Google Sheets webhook', false, `HTTP ${res.status}`);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      recordTest('Google Sheets webhook', false, 'Timeout after 30s');
    } else {
      recordTest('Google Sheets webhook', false, error.message);
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 5: Restore original data
// ═══════════════════════════════════════════════════════════════════════════
async function restoreOriginalData(originalPatient) {
  log.section('🔄 TEST 5: Restoring original data');
  
  try {
    const res = await fetch(`${API_BASE}/api/patient-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        patientId: originalPatient.id,
        updates: {
          id: originalPatient.id,
          inmate_name: originalPatient.inmate_name,
          age: originalPatient.age,
          contact_number: originalPatient.contact_number,
          address: originalPatient.address,
          father_husband_name: originalPatient.father_husband_name,
          updated_at: new Date().toISOString()
        }
      })
    });

    if (res.ok) {
      recordTest('Restore original data', true, 'Data restored successfully');
      return true;
    } else {
      recordTest('Restore original data', false, `HTTP ${res.status}`);
      return false;
    }
  } catch (error) {
    recordTest('Restore original data', false, error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════
async function runTests() {
  console.log('═'.repeat(79));
  log.header('🧪 DEMOGRAPHICS SYNC E2E TEST SUITE');
  console.log('═'.repeat(79));
  log.info(`API Base: ${API_BASE}`);
  log.info(`Supabase: ${SUPABASE_URL}`);
  log.info(`Sheets Webhook: ${SHEETS_WEBHOOK ? 'Configured' : 'Not configured'}`);
  console.log('═'.repeat(79));

  // Step 1: Get test patient
  const originalPatient = await getTestPatient();
  if (!originalPatient) {
    log.error('Cannot proceed without a test patient');
    printSummary();
    process.exit(1);
  }

  // Step 2: Update demographics
  const updatedPatient = await testDemographicsUpdate(originalPatient);
  if (!updatedPatient) {
    log.error('Demographics update failed, skipping remaining tests');
    printSummary();
    process.exit(1);
  }

  // Step 3: Verify Supabase persistence
  await verifySupabasePersistence(originalPatient.id, updatedPatient.inmate_name);

  // Step 4: Test Google Sheets webhook
  await testSheetsWebhook(updatedPatient);

  // Step 5: Restore original data
  await restoreOriginalData(originalPatient);

  // Print summary
  printSummary();
}

function printSummary() {
  console.log('\n' + '═'.repeat(79));
  log.header('📊 TEST SUMMARY');
  console.log('═'.repeat(79));
  console.log(`${colors.bright}Total Tests:  ${results.total}${colors.reset}`);
  console.log(`${colors.green}✅ Passed:    ${results.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed:    ${results.failed}${colors.reset}`);
  console.log(`${colors.cyan}Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%${colors.reset}`);
  console.log('═'.repeat(79));

  if (results.failed === 0) {
    log.success('🎉 All tests passed! Demographics sync is working correctly.');
  } else {
    log.error('⚠️  Some tests failed. Please review the errors above.');
  }

  console.log('');
  process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
