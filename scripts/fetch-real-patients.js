/**
 * Fetch Real Patient Data for Testing
 * Gets actual patient IDs and UUIDs from Supabase
 */

const https = require('https');

const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

async function fetchPatients() {
  return new Promise((resolve, reject) => {
    const url = new URL('/rest/v1/patients?select=id,kobo_uuid,inmate_name,serial_number&kobo_uuid=not.is.null&limit=5', SUPABASE_URL);
    
    const options = {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('🔍 Fetching real patient data from Supabase...\n');
  
  try {
    const patients = await fetchPatients();
    
    if (patients.length === 0) {
      console.log('❌ No patients found with kobo_uuid');
      return;
    }
    
    console.log(`✅ Found ${patients.length} patients with UUIDs:\n`);
    
    patients.forEach((patient, idx) => {
      console.log(`Patient ${idx + 1}:`);
      console.log(`  ID: ${patient.id}`);
      console.log(`  Name: ${patient.inmate_name}`);
      console.log(`  UUID: ${patient.kobo_uuid}`);
      console.log(`  Serial: ${patient.serial_number || 'N/A'}`);
      console.log('');
    });
    
    console.log('📋 Use these values in test-triple-sync.js:');
    console.log('');
    console.log('const testPayloads = [');
    console.log('  {');
    console.log('    name: \'Clinical Update (Referral)\',');
    console.log('    payload: {');
    console.log(`      patientId: ${patients[0].id},`);
    console.log(`      koboUuid: '${patients[0].kobo_uuid}',`);
    console.log('      updates: {');
    console.log('        \'Date of referral for TB Examination (sputum) (dd/mm/yy)\': \'2024-01-15\',');
    console.log('        \'Name of facility where referred to (Give code/name of all facilities)\': \'DMC-Designated microscopy Centre\',');
    console.log(`        'Serial Number': ${patients[0].serial_number || patients[0].id},`);
    console.log(`        'KoboUUID': '${patients[0].kobo_uuid}'`);
    console.log('      }');
    console.log('    }');
    console.log('  },');
    console.log('  // ... add more test cases with other patient IDs');
    console.log('];');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
