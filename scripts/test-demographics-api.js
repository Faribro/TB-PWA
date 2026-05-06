// Test demographics sync via API endpoint
// Tests all editable fields through the actual patient-sync API

const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://samadhaan-84h0rkpmz-faribros-projects.vercel.app'
  : 'http://localhost:3000';

// Test data for each field group
const FIELD_GROUPS = [
  {
    name: 'Identity & Contact',
    fields: {
      father_husband_name: 'Test Father API',
      date_of_birth: '1985-06-15',
      age: 38,
      sex: 'Female',
      inmate_type: 'Convicted',
      contact_number: '8888888888',
      address: 'Test Address API',
      inmate_name: 'Test Inmate API'
    }
  },
  {
    name: 'Screening Encounter',
    fields: {
      screening_date: '2026-05-06',
      facility_name: 'Test Facility API',
      facility_type: 'District Jail',
      screening_state: 'Maharashtra',
      screening_district: 'Mumbai',
      staff_name: 'Test Staff API',
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
      art_center: 'Test ART Center API',
      cpt_given: true
    }
  },
  {
    name: 'Registration & System',
    fields: {
      unique_id: 'API-TEST-' + Date.now(),
      nikshay_id: 'NIK-API-' + Date.now(),
      abha_id: 'ABHA-API-' + Date.now()
    }
  }
];

async function testFieldGroup(patientId, group) {
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
  
  try {
    const response = await fetch(`${BASE_URL}/api/patient-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ API Error (${response.status}): ${error}`);
      return { success: false, error: error, status: response.status };
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
      console.log(`   ❌ Failed fields: ${failedFields.join(', ')}`);
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

async function runApiTest() {
  console.log('🚀 DEMOGRAPHICS API SYNC TEST');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📋 Testing ${FIELD_GROUPS.length} field groups\n`);
  
  // Use an existing patient ID for testing
  const TEST_PATIENT_ID = process.env.TEST_PATIENT_ID || 'fdf26115-5782-4afc-aba4-2ac44585508f';
  
  console.log(`📋 Using patient ID: ${TEST_PATIENT_ID}\n`);
  
  const results = [];
  const summary = {
    totalGroups: FIELD_GROUPS.length,
    passedGroups: 0,
    failedGroups: 0,
    totalFields: 0,
    verifiedFields: 0,
    errors: []
  };
  
  // Test each field group
  for (const group of FIELD_GROUPS) {
    const result = await testFieldGroup(TEST_PATIENT_ID, group);
    results.push({
      group: group.name,
      ...result
    });
    
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
  
  results.forEach(({ group, success, totalFields, verifiedFields, error, failedFields }) => {
    console.log(`${success ? '✅' : '❌'} ${group}`);
    console.log(`   Fields: ${verifiedFields}/${totalFields} verified`);
    if (!success) {
      if (error) console.log(`   Error: ${error}`);
      if (failedFields?.length > 0) {
        console.log(`   Failed: ${failedFields.slice(0, 3).join(', ')}${failedFields.length > 3 ? '...' : ''}`);
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
  console.log(`   Success rate: ${((summary.passedGroups / summary.totalGroups) * 100).toFixed(1)}%`);
  console.log('');
  console.log(`   Total fields: ${summary.totalFields}`);
  console.log(`   ✅ Verified: ${summary.verifiedFields}`);
  console.log(`   ❌ Failed: ${summary.totalFields - summary.verifiedFields}`);
  console.log(`   Field success rate: ${((summary.verifiedFields / summary.totalFields) * 100).toFixed(1)}%`);
  
  if (summary.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    summary.errors.forEach(({ group, error, failedFields }) => {
      console.log(`   • ${group}: ${error}`);
      if (failedFields?.length > 0) {
        console.log(`     Failed fields: ${failedFields.slice(0, 3).join(', ')}${failedFields.length > 3 ? '...' : ''}`);
      }
    });
  }
  
  console.log('\n═'.repeat(80));
  
  if (summary.failedGroups === 0) {
    console.log('🎉 ALL FIELD GROUPS SYNCED SUCCESSFULLY!');
    console.log('✅ All editable demographics fields are working correctly');
  } else {
    console.log(`⚠️ ${summary.failedGroups} field group(s) failed to sync`);
    console.log('Please check the errors above');
  }
  
  return summary;
}

// Run the test
if (require.main === module) {
  runApiTest().catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
}

module.exports = { runApiTest, FIELD_GROUPS };
