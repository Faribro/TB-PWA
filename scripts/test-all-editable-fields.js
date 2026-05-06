// Test all editable fields in demographics
// Usage: node scripts/test-all-editable-fields.js

const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://samadhaan-84h0rkpmz-faribros-projects.vercel.app'
  : 'http://localhost:3000';

// All editable fields and their test values
const EDITABLE_FIELDS = {
  // Screening Details
  staffname: { test: 'Test Staff', label: 'Staff Name' },
  submittedon: { test: '2026-05-03', label: 'Submitted On', type: 'date' },
  screeningstate: { test: 'Test State', label: 'Screening State' },
  screeningdistrict: { test: 'Test District', label: 'Screening District' },
  facilitycode: { test: 'Test Facility', label: 'Facility Name' },
  facilitytype: { test: 'Test Type', label: 'Facility Type' },
  screeningdate: { test: '2026-05-04', label: 'Screening Date', type: 'date' },
  uniqueid: { test: 'TEST-123', label: 'Unique ID' },
  
  // Identity
  inmatename: { test: 'Test Inmate', label: 'Inmate Name' },
  inmatetype: { test: 'Test Type', label: 'Inmate Type' },
  fatherhusbandname: { test: 'Test Father', label: 'Father/Husband Name' },
  dateofbirth: { test: '1990-01-01', label: 'Date of Birth', type: 'date' },
  age: { test: 30, label: 'Age', type: 'number' },
  sex: { test: 'female', label: 'Sex' },
  contactnumber: { test: '9999999999', label: 'Contact Number' },
  address: { test: 'Test Address', label: 'Address' },
  
  // TB Screening
  xrayresult: { test: 'NORMAL', label: 'X-Ray Result' },
  symptoms10s: { test: 'No symptoms', label: 'Symptoms 10s' },
  tbpasthistory: { test: 'No history', label: 'TB Past History' }
};

async function testFieldUpdate(patientId, fieldName, testData) {
  console.log(`\n🧪 Testing ${testData.label} (${fieldName})`);
  
  const payload = {
    id: patientId,
    [fieldName]: testData.test
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/patient-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `authjs.session-token=test-session` // You'll need to replace with actual session
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`✅ ${testData.label}: SUCCESS`);
      console.log(`   Sent: ${testData.test}`);
      console.log(`   Saved: ${result.patient[fieldName.replace(/([A-Z])/g, '_$1').toLowerCase()] || result.patient[fieldName]}`);
      return true;
    } else {
      console.log(`❌ ${testData.label}: FAILED`);
      console.log(`   Error: ${result.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${testData.label}: ERROR`);
    console.log(`   ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing all editable fields in demographics');
  console.log(`📍 Base URL: ${BASE_URL}`);
  
  // You'll need to provide a valid patient ID
  const TEST_PATIENT_ID = process.env.TEST_PATIENT_ID || 'fdf26115-5782-4afc-aba4-2ac44585508f';
  
  if (!TEST_PATIENT_ID) {
    console.error('❌ Please set TEST_PATIENT_ID in your .env.local file');
    process.exit(1);
  }
  
  console.log(`📋 Using patient ID: ${TEST_PATIENT_ID}`);
  
  const results = [];
  
  for (const [fieldName, testData] of Object.entries(EDITABLE_FIELDS)) {
    const success = await testFieldUpdate(TEST_PATIENT_ID, fieldName, testData);
    results.push({ field: testData.label, success });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('─'.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(({ field, success }) => {
    console.log(`${success ? '✅' : '❌'} ${field}`);
  });
  
  console.log('─'.repeat(50));
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some fields failed. Check the logs above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All editable fields are working correctly!');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testFieldUpdate, EDITABLE_FIELDS };
