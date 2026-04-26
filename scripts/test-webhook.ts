#!/usr/bin/env ts-node

/**
 * KoboCollect Webhook Test Script
 * Tests POST /api/webhook/kobo endpoint
 */

(async () => {
const WEBHOOK_URL = 'http://localhost:3000/api/webhook/kobo';
const WEBHOOK_SECRET = 'alliance_kobo_secure_2026';

interface TestResult {
  name: string;
  passed: boolean;
  status: number;
  response: any;
  error?: string;
}

// Mock KoboCollect payload
const mockPayload = {
  _uuid: `test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  _id: Math.floor(Math.random() * 1000000),
  _submission_time: new Date().toISOString(),
  _submitted_by: 'test_user',
  
  'grp_screening/staff_name': 'Dr. Test Kumar',
  'grp_screening/screening_state': 'madhya_pradesh',
  'grp_screening/screening_district': 'Gwalior',
  'grp_screening/facility_code': 'CJ',
  'grp_screening/facility_name': 'Central Jail',
  'grp_screening/facility_type': 'prison',
  'grp_screening/screening_date': '2025-01-26',
  
  'grp_identity/inmate_name': 'Test Patient Kumar',
  'grp_identity/inmate_type': 'under_trial',
  'grp_identity/father_husband_name': 'Test Father Name',
  
  'grp_demo/date_of_birth': '1990-05-15',
  'grp_demo/age': '35',
  'grp_demo/sex': 'male',
  'grp_demo/contact_number': '9876543210',
  
  'grp_address/address_block_house': 'Block A, House 123',
  'grp_address/address_city': 'Gwalior',
  'grp_address/address_state': 'Madhya Pradesh',
  'grp_address/address_pin_code': '474001',
  
  'grp_tb/xray_result': 'normal',
  'grp_tb/symptoms_10s': 'no_symptoms',
  'grp_tb/tb_past_history': 'no',
  
  _geolocation: [26.2183, 78.1828],
};

async function sendRequest(secret: string | null, payload: any): Promise<TestResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (secret) {
    headers['x-kobo-webhook-secret'] = secret;
  }
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    
    return {
      name: '',
      passed: false,
      status: response.status,
      response: data,
    };
  } catch (error: any) {
    return {
      name: '',
      passed: false,
      status: 0,
      response: null,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 KOBO WEBHOOK TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Target: ${WEBHOOK_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  const tests: Array<{ name: string; secret: string | null; payload: any; expectedStatus: number }> = [
    {
      name: 'Valid webhook with correct secret',
      secret: WEBHOOK_SECRET,
      payload: mockPayload,
      expectedStatus: 200,
    },
    {
      name: 'Invalid secret (should fail)',
      secret: 'wrong_secret',
      payload: mockPayload,
      expectedStatus: 401,
    },
    {
      name: 'Missing secret header (should fail)',
      secret: null,
      payload: mockPayload,
      expectedStatus: 401,
    },
    {
      name: 'Missing UUID (should fail)',
      secret: WEBHOOK_SECRET,
      payload: { ...mockPayload, _uuid: undefined },
      expectedStatus: 400,
    },
  ];
  
  const results: TestResult[] = [];
  
  for (const test of tests) {
    console.log(`\n🔄 Running: ${test.name}...`);
    const result = await sendRequest(test.secret, test.payload);
    result.name = test.name;
    result.passed = result.status === test.expectedStatus;
    
    console.log(`   Status: ${result.status} (expected ${test.expectedStatus})`);
    console.log(`   Result: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    } else {
      console.log(`   Response:`, JSON.stringify(result.response, null, 2));
    }
    
    results.push(result);
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total: ${results.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%\n`);
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
})();
