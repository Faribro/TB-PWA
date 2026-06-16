// Simple authenticated test using fetch with session token
// Tests demographics sync by making authenticated API calls

const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://samadhaan-84h0rkpmz-faribros-projects.vercel.app'
  : 'http://localhost:3000';

// Test data for each field group
const FIELD_TESTS = [
  {
    name: 'Identity & Contact',
    fields: {
      father_husband_name: 'Auth Test Father Simple',
      date_of_birth: '1985-06-15',
      age: 38,
      sex: 'Female',
      inmate_type: 'Convicted',
      contact_number: '8888888888',
      address: 'Auth Test Address Simple',
      inmate_name: 'Auth Test Patient Simple'
    }
  },
  {
    name: 'Screening Encounter',
    fields: {
      screening_date: '2026-05-06',
      facility_name: 'Auth Test Facility Simple',
      facility_type: 'District Jail',
      screening_state: 'Maharashtra',
      screening_district: 'Mumbai',
      staff_name: 'Auth Test Staff Simple',
      submitted_on: '2026-05-06'
    }
  },
  {
    name: 'Diagnostics & Treatment',
    fields: {
      xray_result: 'Suspected TB Case',
      tb_past_history: 'Yes',
      tb_diagnosed_select: 'Inconclusive',
      diagnosis_date: '2026-05-06',
      att_start_date: '2026-05-06',
      referral_date: '2026-05-06',
      referred_to_facility: 'CBNAAT',
      treatment_regimen: '2HRZE/4HR'
    }
  },
  {
    name: 'HIV / ART Status',
    fields: {
      hiv_status: 'Positive',
      art_started: 'Yes',
      art_center: 'Auth Test ART Center Simple',
      cpt_given: true
    }
  },
  {
    name: 'Registration & System',
    fields: {
      unique_id: 'SIMPLE-' + Date.now(),
      nikshay_id: 'NIK-SIMPLE-' + Date.now(),
      abha_id: 'ABHA-SIMPLE-' + Date.now()
    }
  }
];

// Simulate getting a session token by logging in
async function getSessionToken(email, password) {
  console.log('🔐 Getting session token...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: email,
        password: password,
        csrfToken: 'test-csrf-token', // This might not work without proper CSRF
        callbackUrl: `${BASE_URL}/dashboard`,
        json: 'true'
      })
    });
    
    if (response.ok) {
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        const sessionCookie = cookies.split(';')[0];
        console.log('✅ Session token obtained');
        return sessionCookie;
      }
    }
    
    throw new Error('Failed to get session token');
  } catch (error) {
    console.log('⚠️ Could not get session token via API, trying alternative...');
    // Return a placeholder for manual testing
    return null;
  }
}

async function testFieldGroup(patientId, group, sessionCookie) {
  console.log(`\n🧪 Testing: ${group.name}`);
  console.log(`📊 Fields: ${Object.keys(group.fields).join(', ')}`);
  
  const payload = {
    patientId: patientId,
    updates: {
      id: patientId,
      ...group.fields,
      updated_at: new Date().toISOString()
    }
  };
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/patient-sync`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ API Error (${response.status}): ${error}`);
      
      if (response.status === 401) {
        console.log('   💡 This requires browser authentication. Please test manually.');
        console.log('   📋 Use the browser-test-checklist.md file for manual testing.');
      }
      
      return { 
        success: false, 
        error: error, 
        status: response.status,
        requiresBrowserAuth: response.status === 401
      };
    }
    
    const result = await response.json();
    console.log(`   ✅ API Success: ${result.success}`);
    
    if (!result.success) {
      console.log(`   ❌ Save failed: ${result.error}`);
      return { success: false, error: result.error };
    }
    
    // Check returned patient data
    console.log(`   📋 Response includes patient data: ${!!result.patient}`);
    
    // Verify fields in response
    const verifiedFields = [];
    const failedFields = [];
    
    for (const [fieldKey, expectedValue] of Object.entries(group.fields)) {
      const actualValue = result.patient?.[fieldKey];
      
      // Handle boolean conversion
      if (typeof expectedValue === 'boolean') {
        if (actualValue === expectedValue) {
          verifiedFields.push(fieldKey);
        } else {
          failedFields.push(`${fieldKey}: expected ${expectedValue}, got ${actualValue}`);
        }
      } else if (actualValue == expectedValue) {
        verifiedFields.push(fieldKey);
      } else {
        failedFields.push(`${fieldKey}: expected "${expectedValue}", got "${actualValue}"`);
      }
    }
    
    console.log(`   ✅ Verified fields: ${verifiedFields.length}`);
    if (failedFields.length > 0) {
      console.log(`   ❌ Failed fields: ${failedFields.slice(0, 3).join(', ')}${failedFields.length > 3 ? '...' : ''}`);
    }
    
    return {
      success: failedFields.length === 0,
      verifiedFields: verifiedFields.length,
      totalFields: Object.keys(group.fields).length,
      failedFields,
      apiResponse: result
    };
    
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runSimpleAuthTest() {
  console.log('🚀 SIMPLE AUTHENTICATED DEMOGRAPHICS SYNC TEST');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📋 Testing ${FIELD_TESTS.length} field groups\n`);
  
  // Get credentials from environment
  const TEST_EMAIL = process.env.TEST_EMAIL;
  const TEST_PASSWORD = process.env.TEST_PASSWORD;
  const TEST_PATIENT_ID = process.env.TEST_PATIENT_ID || 'fdf26115-5782-4afc-aba4-2ac44585508f';
  
  console.log(`📋 Using patient ID: ${TEST_PATIENT_ID}`);
  
  // Try to get session token
  let sessionCookie = null;
  if (TEST_EMAIL && TEST_PASSWORD) {
    sessionCookie = await getSessionToken(TEST_EMAIL, TEST_PASSWORD);
  } else {
    console.log('⚠️ No credentials provided in .env.local');
    console.log('   Set TEST_EMAIL and TEST_PASSWORD to test with authentication');
  }
  
  const results = [];
  const summary = {
    totalGroups: FIELD_TESTS.length,
    passedGroups: 0,
    failedGroups: 0,
    requiresBrowserAuth: false,
    totalFields: 0,
    verifiedFields: 0,
    errors: []
  };
  
  // Test each field group
  for (const group of FIELD_TESTS) {
    const result = await testFieldGroup(TEST_PATIENT_ID, group, sessionCookie);
    results.push({
      group: group.name,
      ...result
    });
    
    if (result.requiresBrowserAuth) {
      summary.requiresBrowserAuth = true;
    }
    
    summary.totalFields += result.totalFields || 0;
    summary.verifiedFields += result.verifiedFields || 0;
    
    if (result.success) {
      summary.passedGroups++;
    } else {
      summary.failedGroups++;
      summary.errors.push({
        group: group.name,
        error: result.error || 'Unknown error',
        failedFields: result.failedFields || []
      });
    }
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Print results
  console.log('\n📊 TEST RESULTS:');
  console.log('═'.repeat(80));
  
  results.forEach(({ group, success, totalFields, verifiedFields, error, failedFields, requiresBrowserAuth }) => {
    if (requiresBrowserAuth) {
      console.log(`🔐 ${group} - Requires browser authentication`);
    } else {
      console.log(`${success ? '✅' : '❌'} ${group}`);
      console.log(`   Fields: ${verifiedFields}/${totalFields} verified`);
      if (!success) {
        if (error) console.log(`   Error: ${error}`);
        if (failedFields?.length > 0) {
          console.log(`   Failed: ${failedFields.slice(0, 3).join(', ')}${failedFields.length > 3 ? '...' : ''}`);
        }
      }
    }
    console.log('');
  });
  
  // Summary
  console.log('═'.repeat(80));
  console.log('📊 SUMMARY:');
  console.log(`   Groups tested: ${summary.totalGroups}`);
  console.log(`   ✅ Passed: ${summary.passedGroups}`);
  console.log(`   ❌ Failed: ${summary.failedGroups}`);
  console.log(`   🔐 Need browser auth: ${summary.requiresBrowserAuth ? 'Yes' : 'No'}`);
  console.log('');
  
  if (summary.requiresBrowserAuth) {
    console.log('🌐 BROWSER TESTING REQUIRED');
    console.log('   The API requires browser-based authentication.');
    console.log('   Please use the manual browser test checklist:');
    console.log('   📄 scripts/browser-test-checklist.md');
    console.log('');
    console.log('   Steps:');
    console.log('   1. Open http://localhost:3000');
    console.log('   2. Login with your credentials');
    console.log('   3. Navigate to patient: ' + TEST_PATIENT_ID);
    console.log('   4. Test each field group using the checklist');
  } else {
    console.log(`   Total fields: ${summary.totalFields}`);
    console.log(`   ✅ Verified: ${summary.verifiedFields}`);
    console.log(`   ❌ Failed: ${summary.totalFields - summary.verifiedFields}`);
    console.log(`   Success rate: ${((summary.verifiedFields / summary.totalFields) * 100).toFixed(1)}%`);
  }
  
  console.log('\n═'.repeat(80));
  
  if (summary.requiresBrowserAuth) {
    console.log('🔍 Use browser testing for complete validation');
  } else if (summary.failedGroups === 0) {
    console.log('🎉 ALL FIELD GROUPS SYNCED SUCCESSFULLY!');
  } else {
    console.log(`⚠️ ${summary.failedGroups} field group(s) failed to sync`);
  }
  
  return summary;
}

// Run the test
if (require.main === module) {
  runSimpleAuthTest().catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
}

module.exports = { runSimpleAuthTest, FIELD_TESTS };
