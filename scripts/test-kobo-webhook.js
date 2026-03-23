#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KoboToolbox Webhook Simulator
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Test the /api/webhook/kobo endpoint locally
 * Usage: node scripts/test-kobo-webhook.js
 * 
 * This script simulates a real KoboToolbox webhook POST request with:
 * - Proper authentication header
 * - Realistic mock payload matching Kobo's field structure
 * - Comprehensive logging and error handling
 */

const WEBHOOK_URL = 'http://localhost:3000/api/webhook/kobo';
const WEBHOOK_SECRET = 'alliance_kobo_secure_2026';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK KOBO PAYLOAD - Matches real KoboToolbox submission structure
// ═══════════════════════════════════════════════════════════════════════════
const mockKoboPayload = {
  // Core identifiers
  _uuid: `550e8400-e29b-41d4-a716-${Date.now().toString().slice(-12)}`,
  _id: Math.floor(Math.random() * 1000000),
  _submission_time: new Date().toISOString(),
  _submitted_by: 'test_user',
  
  // Staff information (4-way fallback support)
  'grp_screening/staff_name': 'Dr. Test Kumar',
  'grp_screening/Name_of_the_Staff': 'Dr. Test Kumar',
  
  // Location
  'grp_screening/screening_state': 'madhya_pradesh',
  'grp_screening/State': 'Madhya Pradesh',
  'grp_screening/screening_district': 'Gwalior',
  'grp_screening/District': 'Gwalior',
  
  // Facility
  'grp_screening/facility_code': 'CJ',
  'grp_screening/facility_name': 'Central Jail',
  'grp_screening/facility_type': 'prison',
  'grp_screening/Facility_type': 'Prison',
  
  // Screening date
  'grp_screening/screening_date': '2025-01-26',
  'grp_screening/Date_of_Screening_CH_x_ray_dd_mm_yy': '2025-01-26',
  
  // Patient identity
  'grp_identity/inmate_name': 'Test Patient Kumar',
  'grp_identity/Inmate_Name': 'Test Patient Kumar',
  'grp_identity/inmate_type': 'under_trial',
  'grp_identity/Inmate_type_Under_Trial_Convicted_Other': 'Under Trial',
  'grp_identity/father_husband_name': 'Test Father Name',
  'grp_identity/Father_Husband_s_Name': 'Test Father Name',
  
  // Demographics
  'grp_demo/date_of_birth': '1990-05-15',
  'grp_demo/Date_of_Birth': '1990-05-15',
  'grp_demo/age': '35',
  'grp_demo/sex': 'male',
  'grp_demo/Sex_Male_Female_TG': 'Male',
  'grp_demo/contact_number': '9876543210',
  'grp_demo/Contact_Number': '9876543210',
  
  // Address components
  'grp_address/address_block_house': 'Block A, House 123',
  'grp_address/address_street': 'Main Street',
  'grp_address/address_city': 'Gwalior',
  'grp_address/address_district': 'Gwalior',
  'grp_address/address_state': 'Madhya Pradesh',
  'grp_address/address_country': 'India',
  'grp_address/address_pin_code': '474001',
  
  // TB Screening
  'grp_tb/xray_result': 'normal',
  'grp_tb/Chest_x_ray_Result_Active_Lat': 'NORMAL',
  'grp_tb/symptoms_10s': 'no_symptoms',
  'grp_tb/_10s_Symptoms_Present_You_can': 'No Symptoms',
  'grp_tb/tb_past_history': 'no',
  'grp_tb/Whether_any_past_history_of_TB_Y_N': 'No',
  
  // Referral
  'grp_referral/referral_date': '2025-01-27',
  'grp_referral/Date_of_referral_for_ion_sputum_dd_mm_yy': '2025-01-27',
  'grp_referral/referred_facility': 'dmc_designated_microscopy_centre',
  'grp_referral/tb_diagnosed': 'no',
  'grp_referral/TB_diagnosed': 'No',
  
  // HIV Status
  'grp_hiv/hiv_status': 'negative',
  'grp_hiv/HIV_Status_Positive_Negative_': 'Negative',
  
  // Registration
  'grp_reg/nikshay_abha_id': 'TEST123456789',
  'grp_reg/NIKSHAY_ABHA_ID': 'TEST123456789',
  'grp_reg/remarks': 'Test submission from webhook simulator',
  'grp_reg/Remarks': 'Test submission from webhook simulator',
  
  // Serial number
  'grp_screening/Serial_Number': 'TEST001',
  'grp_screening/SERIAL_NUMBER': 'TEST001',
  
  // GPS coordinates (Gwalior, MP)
  _geolocation: [26.2183, 78.1828],
  
  // Additional metadata
  _validation_status: {},
  _notes: [],
  _tags: [],
  _status: 'submitted_via_web'
};

// ═══════════════════════════════════════════════════════════════════════════
// TEST SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════
const testScenarios = [
  {
    name: 'Valid Webhook with Correct Secret',
    secret: WEBHOOK_SECRET,
    payload: mockKoboPayload,
    expectedStatus: 200
  },
  {
    name: 'Invalid Secret (Should Fail)',
    secret: 'wrong_secret_123',
    payload: mockKoboPayload,
    expectedStatus: 401
  },
  {
    name: 'Missing Secret Header (Should Fail)',
    secret: null,
    payload: mockKoboPayload,
    expectedStatus: 401
  },
  {
    name: 'Missing UUID (Should Fail)',
    secret: WEBHOOK_SECRET,
    payload: { ...mockKoboPayload, _uuid: undefined, uuid: undefined },
    expectedStatus: 400
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send webhook request to Next.js API
 */
async function sendWebhook(secret, payload) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  // Add secret header if provided
  if (secret) {
    headers['x-kobo-webhook-secret'] = secret;
  }
  
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  
  const responseData = await response.json();
  
  return {
    status: response.status,
    statusText: response.statusText,
    data: responseData
  };
}

/**
 * Format test result output
 */
function logTestResult(scenario, result, passed) {
  const icon = passed ? '✅' : '❌';
  const status = passed ? 'PASSED' : 'FAILED';
  
  console.log(`\n${icon} ${status}: ${scenario.name}`);
  console.log('─'.repeat(80));
  console.log(`Expected Status: ${scenario.expectedStatus}`);
  console.log(`Actual Status:   ${result.status} ${result.statusText}`);
  console.log(`Response:`, JSON.stringify(result.data, null, 2));
}

/**
 * Test health check endpoint
 */
async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check Endpoint (GET)...');
  console.log('─'.repeat(80));
  
  try {
    const response = await fetch(WEBHOOK_URL, { method: 'GET' });
    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Health check passed');
    } else {
      console.log('⚠️ Unexpected health check response');
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════
async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 KOBOTOOLBOX WEBHOOK SIMULATOR');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Target URL: ${WEBHOOK_URL}`);
  console.log(`Secret: ${WEBHOOK_SECRET}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════════════════');
  
  // Test health check first
  await testHealthCheck();
  
  // Run all test scenarios
  let passedTests = 0;
  let failedTests = 0;
  
  for (const scenario of testScenarios) {
    try {
      console.log(`\n🔄 Running: ${scenario.name}...`);
      
      const result = await sendWebhook(scenario.secret, scenario.payload);
      const passed = result.status === scenario.expectedStatus;
      
      logTestResult(scenario, result, passed);
      
      if (passed) {
        passedTests++;
      } else {
        failedTests++;
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`\n❌ ERROR in ${scenario.name}:`, error.message);
      failedTests++;
    }
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Total Tests:  ${testScenarios.length}`);
  console.log(`✅ Passed:    ${passedTests}`);
  console.log(`❌ Failed:    ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / testScenarios.length) * 100).toFixed(1)}%`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  
  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTE
// ═══════════════════════════════════════════════════════════════════════════
runTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
