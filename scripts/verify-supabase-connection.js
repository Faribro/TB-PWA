/**
 * Supabase Connection Verification Script
 * Tests Service Role Key permissions and RLS bypass
 */

const https = require('https');

const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🔐 SUPABASE SERVICE ROLE KEY VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`Project: wwcgybgvfulotflitogu`);
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Key: ${SERVICE_ROLE_KEY.substring(0, 50)}...`);
console.log('');

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const options = {
      method,
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('📊 TEST 1: Read from patients table (bypassing RLS)');
  console.log('─────────────────────────────────────────────────────────────────────────');
  try {
    const readResult = await makeRequest('GET', '/rest/v1/patients?select=id,inmate_name,screening_state&limit=5');
    console.log(`✅ Status: ${readResult.status}`);
    console.log(`✅ Records fetched: ${readResult.data?.length || 0}`);
    if (readResult.data?.length > 0) {
      console.log(`✅ Sample record:`, readResult.data[0]);
      console.log('✅ RLS BYPASS CONFIRMED - Service role can read all records');
    } else {
      console.log('⚠️  No records found (table might be empty)');
    }
  } catch (error) {
    console.error('❌ Read test failed:', error.message);
  }
  console.log('');

  console.log('✏️  TEST 2: Write to patients table (bypassing RLS)');
  console.log('─────────────────────────────────────────────────────────────────────────');
  const testPatient = {
    unique_id: `TEST_${Date.now()}`,
    inmate_name: 'Test Patient (Verification Script)',
    screening_state: 'Test State',
    screening_district: 'Test District',
    facility_name: 'Test Facility',
    age: '30',
    sex: 'Male'
    // kobo_uuid removed - it expects UUID format, not needed for write test
  };

  try {
    const writeResult = await makeRequest('POST', '/rest/v1/patients', testPatient);
    console.log(`✅ Status: ${writeResult.status}`);
    if (writeResult.status === 201) {
      console.log(`✅ Test record created:`, writeResult.data?.[0]);
      console.log('✅ RLS BYPASS CONFIRMED - Service role can write records');
      
      // Clean up test record
      const testId = writeResult.data?.[0]?.id;
      if (testId) {
        console.log(`🧹 Cleaning up test record (ID: ${testId})...`);
        const deleteResult = await makeRequest('DELETE', `/rest/v1/patients?id=eq.${testId}`);
        console.log(`✅ Test record deleted (Status: ${deleteResult.status})`);
      }
    } else {
      console.log('❌ Write failed:', writeResult.data);
    }
  } catch (error) {
    console.error('❌ Write test failed:', error.message);
  }
  console.log('');

  console.log('🔍 TEST 3: Update existing record (bypassing RLS)');
  console.log('─────────────────────────────────────────────────────────────────────────');
  try {
    // Get first record
    const getResult = await makeRequest('GET', '/rest/v1/patients?select=id,inmate_name&limit=1');
    if (getResult.data?.length > 0) {
      const recordId = getResult.data[0].id;
      const originalName = getResult.data[0].inmate_name;
      
      // Update with test remark
      const updatePayload = { remarks: `Test update at ${new Date().toISOString()}` };
      const updateResult = await makeRequest('PATCH', `/rest/v1/patients?id=eq.${recordId}`, updatePayload);
      
      console.log(`✅ Status: ${updateResult.status}`);
      if (updateResult.status === 200 || updateResult.status === 204) {
        console.log(`✅ Record updated successfully (ID: ${recordId})`);
        console.log('✅ RLS BYPASS CONFIRMED - Service role can update records');
      } else {
        console.log('❌ Update failed:', updateResult.data);
      }
    } else {
      console.log('⚠️  No records available for update test');
    }
  } catch (error) {
    console.error('❌ Update test failed:', error.message);
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ VERIFICATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('📋 SUPABASE CLI COMMANDS:');
  console.log('');
  console.log('# Link to remote project:');
  console.log('supabase link --project-ref wwcgybgvfulotflitogu');
  console.log('');
  console.log('# Pull remote schema:');
  console.log('supabase db pull');
  console.log('');
  console.log('# Run migrations:');
  console.log('supabase db push');
  console.log('');
  console.log('# Generate TypeScript types:');
  console.log('supabase gen types typescript --project-id wwcgybgvfulotflitogu > types/supabase.ts');
  console.log('');
}

runTests().catch(console.error);
