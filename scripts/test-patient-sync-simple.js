/**
 * Simple Patient Sync Test
 * Diagnoses the exact issue with patient-sync endpoint
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
console.log('🔍 PATIENT SYNC DIAGNOSTIC TEST');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log(`   Supabase URL: ${SUPABASE_URL}`);
console.log(`   Service Key: ${SERVICE_ROLE_KEY.substring(0, 20)}...`);
console.log('');

async function test() {
  // Step 1: Get a real patient
  console.log('📋 Step 1: Fetching test patient from Supabase...');
  
  const patientsRes = await fetch(`${SUPABASE_URL}/rest/v1/patients?select=id,kobo_uuid,inmate_name&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });

  if (!patientsRes.ok) {
    console.error(`❌ Failed to fetch patients: ${patientsRes.status}`);
    const text = await patientsRes.text();
    console.error(text);
    process.exit(1);
  }

  const patients = await patientsRes.json();
  
  if (!patients || patients.length === 0) {
    console.error('❌ No patients found in database');
    process.exit(1);
  }

  const patient = patients[0];
  console.log(`✅ Found patient: ${patient.inmate_name} (ID: ${patient.id})`);
  console.log('');

  // Step 2: Test patient-sync endpoint
  console.log('📋 Step 2: Testing /api/patient-sync endpoint...');
  
  const payload = {
    patientId: patient.id,
    updates: {
      'Remarks': `Test at ${new Date().toISOString()}`
    }
  };

  console.log('   Payload:', JSON.stringify(payload, null, 2));
  console.log('');

  const syncRes = await fetch('http://localhost:3000/api/patient-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify(payload)
  });

  console.log(`   Status: ${syncRes.status} ${syncRes.statusText}`);
  
  const data = await syncRes.json();
  console.log('   Response:', JSON.stringify(data, null, 2));
  console.log('');

  // Step 3: Analyze response
  console.log('📋 Step 3: Analysis');
  
  if (syncRes.ok && data.success) {
    console.log('✅ Request succeeded');
    
    if (data.patient) {
      console.log('✅ Patient data returned');
      console.log(`   - ID: ${data.patient.id}`);
      console.log(`   - Name: ${data.patient.inmate_name}`);
      console.log(`   - Remarks: ${data.patient.remarks}`);
    } else {
      console.log('❌ No patient data in response');
    }
  } else {
    console.log('❌ Request failed');
    console.log(`   Error: ${data.error}`);
    console.log(`   Detail: ${data.detail || 'N/A'}`);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ DIAGNOSTIC COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════════════');
}

test().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
