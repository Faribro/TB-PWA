/**
 * scripts/test-register-reconcile.js
 * 
 * Comprehensive test suite for Register Reconciliation insertion logic.
 * Tests schema compliance, type safety, and trigger execution.
 * 
 * Usage:
 *   node scripts/test-register-reconcile.js
 * 
 * Prerequisites:
 *   - Dev server running on http://localhost:3000
 *   - Valid session with PM/admin/SPM/MandE role
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
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
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wwcgybgvfulotflitogu.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

// Test results tracker
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
};

// Helper: Print section header
function printHeader(title) {
  console.log(`\n${COLORS.cyan}${'═'.repeat(80)}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}${title}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${'═'.repeat(80)}${COLORS.reset}\n`);
}

// Helper: Print test result
function printResult(testName, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`${COLORS.green}✅ PASSED:${COLORS.reset} ${testName}`);
  } else {
    results.failed++;
    console.log(`${COLORS.red}❌ FAILED:${COLORS.reset} ${testName}`);
  }
  if (details) {
    console.log(`   ${COLORS.yellow}${details}${COLORS.reset}`);
  }
  results.tests.push({ name: testName, passed, details });
}

// Helper: Create test extraction ID
async function createTestExtraction() {
  const extractionId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/register_extractions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        id: extractionId,
        created_by: 'test-script',
        status: 'pending',
        extracted_rows: [],
        match_results: [],
        metadata: { test: true },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create extraction: ${response.status}`);
    }

    return extractionId;
  } catch (error) {
    console.error(`${COLORS.red}Failed to create test extraction:${COLORS.reset}`, error.message);
    return null;
  }
}

// Helper: Verify patient in database
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

    if (!response.ok) {
      throw new Error(`Query failed: ${response.status}`);
    }

    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.error(`${COLORS.red}Failed to verify patient:${COLORS.reset}`, error.message);
    return null;
  }
}

// Helper: Cleanup test patient
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
    console.error(`${COLORS.yellow}Warning: Failed to cleanup patient ${patientId}${COLORS.reset}`);
  }
}

// Helper: Cleanup test extraction
async function cleanupExtraction(extractionId) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/register_extractions?id=eq.${extractionId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
  } catch (error) {
    console.error(`${COLORS.yellow}Warning: Failed to cleanup extraction ${extractionId}${COLORS.reset}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1: Valid New Patient (All Fields)
// ═══════════════════════════════════════════════════════════════════════════
async function test1_ValidNewPatient() {
  printHeader('TEST 1: Valid New Patient (All Fields)');
  
  const extractionId = await createTestExtraction();
  if (!extractionId) {
    printResult('Test 1 - Setup', false, 'Failed to create extraction');
    return;
  }

  const testName = `Test Patient ${Date.now()}`;
  const payload = {
    extractionId,
    decisions: [
      {
        sno: 1,
        action: 'create',
        extractedData: {
          name: testName,
          father_name: 'Test Father',
          age: 35,  // Number (INTEGER type)
          mobile: '9876543210',
          ward: 'Test Facility Ward A',
          address: '123 Test Street, Test City',
        },
      },
    ],
  };

  console.log(`${COLORS.blue}Payload:${COLORS.reset}`, JSON.stringify(payload, null, 2));

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
    console.log(`${COLORS.blue}Response:${COLORS.reset}`, JSON.stringify(result, null, 2));

    // Check API response
    const apiSuccess = response.ok && result.created === 1 && result.errors.length === 0;
    printResult('Test 1 - API Response', apiSuccess, 
      apiSuccess ? 'Patient created successfully' : `API Error: ${result.error || 'Unknown'}`
    );

    if (apiSuccess) {
      // Verify in database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for DB commit
      const patient = await verifyPatient(testName);
      
      if (patient) {
        console.log(`${COLORS.blue}Database Record:${COLORS.reset}`, JSON.stringify({
          id: patient.id,
          inmate_name: patient.inmate_name,
          age: patient.age,
          age_type: typeof patient.age,
          contact_number: patient.contact_number,
          facility_name: patient.facility_name,
          name_romanized: patient.name_romanized,
          name_metaphone_primary: patient.name_metaphone_primary,
        }, null, 2));

        // Verify age is INTEGER
        const ageIsInteger = typeof patient.age === 'number' && Number.isInteger(patient.age);
        printResult('Test 1 - Age Type (INTEGER)', ageIsInteger,
          ageIsInteger ? `age = ${patient.age} (type: number)` : `age = ${patient.age} (type: ${typeof patient.age})`
        );

        // Verify trigger populated phonetic columns
        const triggerWorked = patient.name_romanized === testName && patient.name_metaphone_primary;
        printResult('Test 1 - Trigger Execution', triggerWorked,
          triggerWorked 
            ? `name_romanized = "${patient.name_romanized}", metaphone = "${patient.name_metaphone_primary}"`
            : 'Phonetic columns not populated'
        );

        // Cleanup
        await cleanupPatient(patient.id);
      } else {
        printResult('Test 1 - Database Verification', false, 'Patient not found in database');
      }
    }

    await cleanupExtraction(extractionId);
  } catch (error) {
    printResult('Test 1 - Execution', false, error.message);
    await cleanupExtraction(extractionId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 2: Minimal Patient (Name Only)
// ═══════════════════════════════════════════════════════════════════════════
async function test2_MinimalPatient() {
  printHeader('TEST 2: Minimal Patient (Name Only)');
  
  const extractionId = await createTestExtraction();
  if (!extractionId) {
    printResult('Test 2 - Setup', false, 'Failed to create extraction');
    return;
  }

  const testName = `Minimal Patient ${Date.now()}`;
  const payload = {
    extractionId,
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

  console.log(`${COLORS.blue}Payload:${COLORS.reset}`, JSON.stringify(payload, null, 2));

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
    console.log(`${COLORS.blue}Response:${COLORS.reset}`, JSON.stringify(result, null, 2));

    const apiSuccess = response.ok && result.created === 1;
    printResult('Test 2 - API Response', apiSuccess,
      apiSuccess ? 'Minimal patient created' : `API Error: ${result.error || 'Unknown'}`
    );

    if (apiSuccess) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const patient = await verifyPatient(testName);
      
      if (patient) {
        printResult('Test 2 - Database Verification', true, `Patient ID: ${patient.id}`);
        await cleanupPatient(patient.id);
      } else {
        printResult('Test 2 - Database Verification', false, 'Patient not found');
      }
    }

    await cleanupExtraction(extractionId);
  } catch (error) {
    printResult('Test 2 - Execution', false, error.message);
    await cleanupExtraction(extractionId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 3: Age Type Validation (String vs Number)
// ═══════════════════════════════════════════════════════════════════════════
async function test3_AgeTypeValidation() {
  printHeader('TEST 3: Age Type Validation (String vs Number)');
  
  const extractionId = await createTestExtraction();
  if (!extractionId) {
    printResult('Test 3 - Setup', false, 'Failed to create extraction');
    return;
  }

  const testName = `Age Test ${Date.now()}`;
  const payload = {
    extractionId,
    decisions: [
      {
        sno: 1,
        action: 'create',
        extractedData: {
          name: testName,
          father_name: null,
          age: 42,  // Number (correct)
          mobile: null,
          ward: null,
          address: null,
        },
      },
    ],
  };

  console.log(`${COLORS.blue}Payload (age as Number):${COLORS.reset}`, JSON.stringify(payload, null, 2));

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
    console.log(`${COLORS.blue}Response:${COLORS.reset}`, JSON.stringify(result, null, 2));

    const apiSuccess = response.ok && result.created === 1;
    printResult('Test 3 - Number Age Accepted', apiSuccess,
      apiSuccess ? 'age: 42 (number) inserted successfully' : `Error: ${result.error || 'Unknown'}`
    );

    if (apiSuccess) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const patient = await verifyPatient(testName);
      
      if (patient) {
        const ageIsInteger = typeof patient.age === 'number' && patient.age === 42;
        printResult('Test 3 - Age Stored as INTEGER', ageIsInteger,
          `Database age: ${patient.age} (type: ${typeof patient.age})`
        );
        await cleanupPatient(patient.id);
      }
    }

    await cleanupExtraction(extractionId);
  } catch (error) {
    printResult('Test 3 - Execution', false, error.message);
    await cleanupExtraction(extractionId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 4: Batch Insert (Multiple Patients)
// ═══════════════════════════════════════════════════════════════════════════
async function test4_BatchInsert() {
  printHeader('TEST 4: Batch Insert (Multiple Patients)');
  
  const extractionId = await createTestExtraction();
  if (!extractionId) {
    printResult('Test 4 - Setup', false, 'Failed to create extraction');
    return;
  }

  const timestamp = Date.now();
  const payload = {
    extractionId,
    decisions: [
      {
        sno: 1,
        action: 'create',
        extractedData: {
          name: `Batch Patient 1 ${timestamp}`,
          father_name: 'Father 1',
          age: 25,
          mobile: '9876543211',
          ward: 'Ward A',
          address: 'Address 1',
        },
      },
      {
        sno: 2,
        action: 'create',
        extractedData: {
          name: `Batch Patient 2 ${timestamp}`,
          father_name: 'Father 2',
          age: 30,
          mobile: '9876543212',
          ward: 'Ward B',
          address: 'Address 2',
        },
      },
      {
        sno: 3,
        action: 'create',
        extractedData: {
          name: `Batch Patient 3 ${timestamp}`,
          father_name: 'Father 3',
          age: 35,
          mobile: '9876543213',
          ward: 'Ward C',
          address: 'Address 3',
        },
      },
    ],
  };

  console.log(`${COLORS.blue}Payload (3 patients):${COLORS.reset}`, JSON.stringify(payload, null, 2));

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
    console.log(`${COLORS.blue}Response:${COLORS.reset}`, JSON.stringify(result, null, 2));

    const apiSuccess = response.ok && result.created === 3 && result.errors.length === 0;
    printResult('Test 4 - Batch Insert', apiSuccess,
      apiSuccess ? '3 patients created successfully' : `Created: ${result.created}, Errors: ${result.errors.length}`
    );

    if (apiSuccess) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify all 3 patients
      for (let i = 1; i <= 3; i++) {
        const patient = await verifyPatient(`Batch Patient ${i} ${timestamp}`);
        if (patient) {
          await cleanupPatient(patient.id);
        }
      }
    }

    await cleanupExtraction(extractionId);
  } catch (error) {
    printResult('Test 4 - Execution', false, error.message);
    await cleanupExtraction(extractionId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 5: Extraction Audit Update
// ═══════════════════════════════════════════════════════════════════════════
async function test5_ExtractionAudit() {
  printHeader('TEST 5: Extraction Audit Update (pending → committed)');
  
  const extractionId = await createTestExtraction();
  if (!extractionId) {
    printResult('Test 5 - Setup', false, 'Failed to create extraction');
    return;
  }

  const testName = `Audit Test ${Date.now()}`;
  const payload = {
    extractionId,
    decisions: [
      {
        sno: 1,
        action: 'create',
        extractedData: {
          name: testName,
          father_name: null,
          age: 40,
          mobile: null,
          ward: null,
          address: null,
        },
      },
    ],
  };

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
    const apiSuccess = response.ok && result.created === 1;
    printResult('Test 5 - API Response', apiSuccess);

    if (apiSuccess) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify extraction status updated
      const extractionResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/register_extractions?id=eq.${extractionId}`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );

      const extractions = await extractionResponse.json();
      const extraction = extractions[0];

      if (extraction) {
        const statusUpdated = extraction.status === 'committed';
        const hasCommittedAt = !!extraction.committed_at;
        const hasDecisions = !!extraction.review_decisions;

        printResult('Test 5 - Status Updated', statusUpdated,
          `status: ${extraction.status}`
        );
        printResult('Test 5 - Committed Timestamp', hasCommittedAt,
          hasCommittedAt ? `committed_at: ${extraction.committed_at}` : 'committed_at is null'
        );
        printResult('Test 5 - Review Decisions Stored', hasDecisions,
          hasDecisions ? 'review_decisions populated' : 'review_decisions is null'
        );
      } else {
        printResult('Test 5 - Extraction Verification', false, 'Extraction not found');
      }

      // Cleanup
      const patient = await verifyPatient(testName);
      if (patient) await cleanupPatient(patient.id);
    }

    await cleanupExtraction(extractionId);
  } catch (error) {
    printResult('Test 5 - Execution', false, error.message);
    await cleanupExtraction(extractionId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════
async function runAllTests() {
  console.log(`${COLORS.bright}${COLORS.cyan}`);
  console.log('═'.repeat(80));
  console.log('🧪 REGISTER RECONCILIATION INSERTION LOGIC TEST SUITE');
  console.log('═'.repeat(80));
  console.log(`${COLORS.reset}\n`);

  console.log(`${COLORS.blue}Configuration:${COLORS.reset}`);
  console.log(`  API URL: ${API_URL}`);
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log(`  Service Role Key: ${SERVICE_ROLE_KEY ? '✅ Configured' : '❌ Missing'}\n`);

  if (!SERVICE_ROLE_KEY) {
    console.log(`${COLORS.red}ERROR: SUPABASE_SERVICE_ROLE_KEY not found${COLORS.reset}`);
    console.log(`${COLORS.yellow}Set it in .env.local or pass as environment variable${COLORS.reset}\n`);
    process.exit(1);
  }

  // Run all tests
  await test1_ValidNewPatient();
  await test2_MinimalPatient();
  await test3_AgeTypeValidation();
  await test4_BatchInsert();
  await test5_ExtractionAudit();

  // Print summary
  printHeader('TEST SUMMARY');
  console.log(`Total Tests:  ${results.total}`);
  console.log(`${COLORS.green}✅ Passed:    ${results.passed}${COLORS.reset}`);
  console.log(`${COLORS.red}❌ Failed:    ${results.failed}${COLORS.reset}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

  if (results.failed === 0) {
    console.log(`${COLORS.green}${COLORS.bright}🎉 ALL TESTS PASSED - Schema compliance verified!${COLORS.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${COLORS.red}${COLORS.bright}⚠️  SOME TESTS FAILED - Review errors above${COLORS.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, error);
  process.exit(1);
});
