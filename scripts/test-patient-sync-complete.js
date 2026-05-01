/**
 * Complete Patient Sync Test
 * Tests all update scenarios with a real patient
 */

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key] && value) {
        process.env[key] = value;
      }
    }
  });
}

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🧪 PATIENT SYNC COMPLETE TEST SUITE');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const TEST_CASES = [
  {
    name: 'Clinical Update (Referral)',
    updates: {
      'Date of referral for TB Examination (sputum) (dd/mm/yy)': '2024-01-15',
      'Name of facility where referred to (Give code/name of all facilities)': 'DMC-Test'
    },
    verify: (patient) => {
      return patient.referral_date === '2024-01-15' && patient.referred_facility === 'DMC-Test';
    }
  },
  {
    name: 'TB Diagnosis Update',
    updates: {
      'TB diagnosed (Y/N)': 'Y',
      'Date of TB Diagnosed (dd/mm/yy)': '2024-02-01',
      'Type of TB Diagnosed (P/EP)': 'P'
    },
    verify: (patient) => {
      return patient.tb_diagnosed === 'Y' && patient.tb_diagnosis_date === '2024-02-01' && patient.tb_type === 'P';
    }
  },
  {
    name: 'Treatment Initiation',
    updates: {
      'Date of starting ATT (dd/mm/yyyy)': '2024-02-05',
      'HIV Status (Positive/Negative/Unknown)': 'Negative',
      'NIKSHAY/ABHA ID': 'TEST123456'
    },
    verify: (patient) => {
      return patient.att_start_date === '2024-02-05' && patient.hiv_status === 'Negative' && patient.nikshay_abha_id === 'TEST123456';
    }
  },
  {
    name: 'Demographics Update',
    updates: {
      'inmate_name': 'Test Patient Updated',
      'age': 30,
      'contact_number': '9876543210'
    },
    verify: (patient) => {
      return patient.inmate_name === 'Test Patient Updated' && patient.age === 30 && patient.contact_number === '9876543210';
    }
  },
  {
    name: 'Loop Closure',
    updates: {
      'TB diagnosed (Y/N)': 'N',
      'closure_reason': 'Not TB - Other diagnosis',
      'Remarks': 'Closed after investigation'
    },
    verify: (patient) => {
      return patient.tb_diagnosed === 'N' && patient.closure_reason === 'Not TB - Other diagnosis';
    }
  }
];

async function runTest(testCase, patientId) {
  console.log(`\n📋 TEST: ${testCase.name}`);
  console.log('─'.repeat(75));
  
  const payload = {
    patientId,
    updates: testCase.updates
  };

  const startTime = Date.now();
  
  const res = await fetch('http://localhost:3000/api/patient-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const duration = Date.now() - startTime;
  const data = await res.json();

  console.log(`   Status: ${res.status} ${res.ok ? '✅' : '❌'}`);
  console.log(`   Duration: ${duration}ms`);

  if (res.ok && data.success) {
    console.log('   ✅ API call succeeded');
    
    if (data.patient) {
      const verified = testCase.verify(data.patient);
      if (verified) {
        console.log('   ✅ Data verification passed');
        return { passed: true, duration };
      } else {
        console.log('   ❌ Data verification failed');
        console.log('   Expected updates:', testCase.updates);
        console.log('   Actual patient:', data.patient);
        return { passed: false, duration, error: 'Verification failed' };
      }
    } else {
      console.log('   ❌ No patient data in response');
      return { passed: false, duration, error: 'No patient data' };
    }
  } else {
    console.log(`   ❌ API call failed: ${data.error}`);
    return { passed: false, duration, error: data.error };
  }
}

async function main() {
  // Get test patient
  console.log('📋 Fetching test patient...');
  
  const patientsRes = await fetch(`${SUPABASE_URL}/rest/v1/patients?select=id,kobo_uuid,inmate_name&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });

  if (!patientsRes.ok) {
    console.error('❌ Failed to fetch patients');
    process.exit(1);
  }

  const patients = await patientsRes.json();
  
  if (!patients || patients.length === 0) {
    console.error('❌ No patients found');
    process.exit(1);
  }

  const patient = patients[0];
  console.log(`✅ Using patient: ${patient.inmate_name} (${patient.id})`);

  // Run all tests
  const results = [];
  
  for (const testCase of TEST_CASES) {
    const result = await runTest(testCase, patient.id);
    results.push({ name: testCase.name, ...result });
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(r => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${r.name.padEnd(35)} ${r.duration}ms`);
    if (r.error) console.log(`     Error: ${r.error}`);
  });

  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${((passed/results.length)*100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('❌ Test suite failed:', err.message);
  process.exit(1);
});
