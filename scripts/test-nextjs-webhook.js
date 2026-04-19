/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEXT.JS WEBHOOK TEST SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Tests the refactored Next.js webhook implementation
 * 
 * Usage:
 * 1. Ensure dev server is running: bun run dev
 * 2. Run: node scripts/test-nextjs-webhook.js
 */

const WEBHOOK_URL = 'http://localhost:3000/api/webhook/kobo';
const WEBHOOK_SECRET = process.env.KOBO_WEBHOOK_SECRET || 'alliance_kobo_secure_2026';

// Test scenarios
const tests = [
  {
    name: 'Valid webhook with all fields',
    payload: {
      _uuid: `test-valid-${Date.now()}`,
      _id: 100001,
      _submission_time: new Date().toISOString(),
      'grp_screening/staff_name': 'Dr. Test Staff',
      'grp_screening/screening_state': 'madhya_pradesh',
      'grp_screening/screening_district': 'Gwalior',
      'grp_screening/facility_code': 'CJ',
      'grp_screening/facility_type': 'prison',
      'grp_screening/screening_date': '2025-01-26',
      'grp_identity/inmate_name': 'Test Patient Alpha',
      'grp_identity/inmate_type': 'under_trial',
      'grp_identity/father_husband_name': 'Test Father',
      'grp_demo/date_of_birth': '1990-01-01',
      'grp_demo/age': '35',
      'grp_demo/sex': 'male',
      'grp_demo/contact_number': '9999999999',
      'grp_tb/xray_result': 'normal',
      'grp_tb/symptoms_10s': 'no_symptoms',
      'grp_tb/tb_past_history': 'no',
      'grp_referral/tb_diagnosed': 'no',
      'grp_hiv/hiv_status': 'negative',
      'grp_screening/Serial_Number': 'TEST001'
    },
    expectedStatus: 200,
    expectedSuccess: true
  },
  {
    name: 'Duplicate UUID (idempotency test)',
    payload: {
      _uuid: 'test-duplicate-12345',
      _id: 100002,
      _submission_time: new Date().toISOString(),
      'grp_identity/inmate_name': 'Duplicate Test Patient',
      'grp_screening/Serial_Number': 'DUP001'
    },
    expectedStatus: 200,
    expectedSuccess: true,
    note: 'Should upsert (update existing record)'
  },
  {
    name: 'Missing UUID (validation failure)',
    payload: {
      _id: 100003,
      'grp_identity/inmate_name': 'No UUID Patient'
    },
    expectedStatus: 400,
    expectedSuccess: false
  },
  {
    name: 'Invalid secret (auth failure)',
    payload: {
      _uuid: `test-invalid-secret-${Date.now()}`,
      'grp_identity/inmate_name': 'Invalid Secret Patient'
    },
    secret: 'wrong_secret',
    expectedStatus: 401,
    expectedSuccess: false
  },
  {
    name: 'Minimal valid payload',
    payload: {
      _uuid: `test-minimal-${Date.now()}`,
      'grp_identity/inmate_name': 'Minimal Patient'
    },
    expectedStatus: 200,
    expectedSuccess: true
  }
];

// Run tests
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 NEXT.JS WEBHOOK TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n🔄 Running: ${test.name}`);
    if (test.note) console.log(`   Note: ${test.note}`);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-kobo-webhook-secret': test.secret || WEBHOOK_SECRET
        },
        body: JSON.stringify(test.payload)
      });

      const data = await response.json();
      const statusMatch = response.status === test.expectedStatus;
      const successMatch = data.success === test.expectedSuccess;

      if (statusMatch && successMatch) {
        console.log(`   ✅ PASSED`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(data, null, 2));
        passed++;
      } else {
        console.log(`   ❌ FAILED`);
        console.log(`   Expected status: ${test.expectedStatus}, got: ${response.status}`);
        console.log(`   Expected success: ${test.expectedSuccess}, got: ${data.success}`);
        console.log(`   Response:`, JSON.stringify(data, null, 2));
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Total Tests:  ${tests.length}`);
  console.log(`✅ Passed:    ${passed}`);
  console.log(`❌ Failed:    ${failed}`);
  console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED - Webhook is production-ready!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review errors above');
  }
}

// Health check first
async function healthCheck() {
  console.log('🏥 Running health check...');
  try {
    const response = await fetch(WEBHOOK_URL);
    const data = await response.json();
    console.log('✅ Health check passed');
    console.log('   Service:', data.service);
    console.log('   Architecture:', data.architecture);
    console.log('   Sheets sync:', data.sheets_sync);
    console.log('');
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    console.log('   Make sure dev server is running: bun run dev\n');
    return false;
  }
}

// Main execution
(async () => {
  const healthy = await healthCheck();
  if (healthy) {
    await runTests();
  } else {
    process.exit(1);
  }
})();
