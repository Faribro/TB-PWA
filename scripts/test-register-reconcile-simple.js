/**
 * scripts/test-register-reconcile-simple.js
 * 
 * Simplified test for Register Reconciliation insertion logic.
 * Tests direct patient insertion without extraction table dependency.
 * 
 * Usage: node scripts/test-register-reconcile-simple.js
 */

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const API_URL = 'http://localhost:3000/api/register-reconcile';
const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

const results = { total: 0, passed: 0, failed: 0 };

function printHeader(title) {
  console.log(`\n${COLORS.cyan}${'═'.repeat(80)}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}${title}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${'═'.repeat(80)}${COLORS.reset}\n`);
}

function printResult(testName, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`${COLORS.green}✅ PASSED:${COLORS.reset} ${testName}`);
  } else {
    results.failed++;
    console.log(`${COLORS.red}❌ FAILED:${COLORS.reset} ${testName}`);
  }
  if (details) console.log(`   ${COLORS.yellow}${details}${COLORS.reset}`);
}

async function verifyPatient(patientName) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/patients?inmate_name=eq.${encodeURIComponent(patientName)}&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );
    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.error(`${COLORS.red}Query error:${COLORS.reset}`, error.message);
    return null;
  }
}

async function cleanupPatient(patientId) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/patients?id=eq.${patientId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
  } catch (error) {
    console.error(`${COLORS.yellow}Cleanup warning:${COLORS.reset}`, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1: Valid New Patient with Age as Number
// ═══════════════════════════════════════════════════════════════════════════
async function test1_ValidPatient() {
  printHeader('TEST 1: Valid New Patient (Age as INTEGER)');
  
  const testName = `Test Patient ${Date.now()}`;
  const payload = {
    extractionId: 'test-simple-001',
    decisions: [
      {
        sno: 1,
        action: 'create',
        extractedData: {
          name: testName,
          father_name: 'Test Father',
          age: 35,  // Number (INTEGER)
          mobile: '9876543210',
          ward: 'Test Ward A',
          address: '123 Test St',
        },
      },
    ],
  };

  console.log(`${COLORS.blue}Payload:${COLORS.reset}`);
  console.log(JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log(`\n${COLORS.blue}Response:${COLORS.reset}`);
    console.log(JSON.stringify(result, null, 2));

    const apiSuccess = response.ok && result.created === 1;
    printResult('API Response', apiSuccess, 
      apiSuccess ? 'Patient created' : `Error: ${result.error || JSON.stringify(result.errors)}`
    );

    if (apiSuccess) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const patient = await verifyPatient(testName);
      
      if (patient) {
        console.log(`\n${COLORS.blue}Database Record:${COLORS.reset}`);
        console.log(JSON.stringify({
          id: patient.id,
          inmate_name: patient.inmate_name,
          age: patient.age,
          age_type: typeof patient.age,
          contact_number: patient.contact_number,
          facility_name: patient.facility_name,
          name_romanized: patient.name_romanized,
          name_metaphone_primary: patient.name_metaphone_primary,
        }, null, 2));

        const ageIsInteger = typeof patient.age === 'number';
        printResult('Age Type (INTEGER)', ageIsInteger,
          `age = ${patient.age} (type: ${typeof patient.age})`
        );

        const triggerWorked = patient.name_romanized === testName;
        printResult('Trigger Execution', triggerWorked,
          triggerWorked 
            ? `name_romanized = "${patient.name_romanized}"`
            : 'Phonetic columns not populated'
        );

        await cleanupPatient(patient.id);
      } else {
        printResult('Database Verification', false, 'Patient not found');
      }
    }
  } catch (error) {
    printResult('Test Execution', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 2: Minimal Patient
// ═══════════════════════════════════════════════════════════════════════════
async function test2_MinimalPatient() {
  printHeader('TEST 2: Minimal Patient (Name Only)');
  
  const testName = `Minimal ${Date.now()}`;
  const payload = {
    extractionId: 'test-simple-002',
    decisions: [
      {
        sno: 1,
        action: 'create',
        extractedData: {
          name: testName,
          father_name: null,
          age: null,
          mobile: null,
          ward: null,
          address: null,
        },
      },
    ],
  };

  console.log(`${COLORS.blue}Payload:${COLORS.reset}`);
  console.log(JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log(`\n${COLORS.blue}Response:${COLORS.reset}`);
    console.log(JSON.stringify(result, null, 2));

    const apiSuccess = response.ok && result.created === 1;
    printResult('API Response', apiSuccess);

    if (apiSuccess) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const patient = await verifyPatient(testName);
      if (patient) {
        printResult('Database Verification', true, `Patient ID: ${patient.id}`);
        await cleanupPatient(patient.id);
      } else {
        printResult('Database Verification', false, 'Patient not found');
      }
    }
  } catch (error) {
    printResult('Test Execution', false, error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function runTests() {
  console.log(`${COLORS.bright}${COLORS.cyan}`);
  console.log('═'.repeat(80));
  console.log('🧪 REGISTER RECONCILIATION - SIMPLIFIED TEST SUITE');
  console.log('═'.repeat(80));
  console.log(`${COLORS.reset}\n`);

  console.log(`${COLORS.blue}Configuration:${COLORS.reset}`);
  console.log(`  API URL: ${API_URL}`);
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log(`  Service Role Key: ✅ Configured\n`);

  await test1_ValidPatient();
  await test2_MinimalPatient();

  printHeader('TEST SUMMARY');
  console.log(`Total Tests:  ${results.total}`);
  console.log(`${COLORS.green}✅ Passed:    ${results.passed}${COLORS.reset}`);
  console.log(`${COLORS.red}❌ Failed:    ${results.failed}${COLORS.reset}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

  if (results.failed === 0) {
    console.log(`${COLORS.green}${COLORS.bright}🎉 ALL TESTS PASSED!${COLORS.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${COLORS.red}${COLORS.bright}⚠️  SOME TESTS FAILED${COLORS.reset}\n`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, error);
  process.exit(1);
});
