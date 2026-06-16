/**
 * Date Input Diagnostic Test
 * Tests patient-sync API with various date formats
 */

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

const BACKEND_URL = 'http://localhost:3000';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

// Fetch a real patient ID first
let TEST_PATIENT_ID = null;

async function testDateFormat(testName, updates) {
  console.log(`\n🧪 TEST: ${testName}`);
  console.log('📤 Sending:', JSON.stringify(updates, null, 2));
  
  try {
    const res = await fetch(`${BACKEND_URL}/api/patient-sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: TEST_PATIENT_ID,
        ...updates,
      }),
    });

    const contentType = res.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      
      if (res.ok) {
        console.log('✅ Status:', res.status);
        console.log('📥 Response:', JSON.stringify(data, null, 2));
      } else {
        console.log('❌ Status:', res.status);
        console.log('📥 Error:', JSON.stringify(data, null, 2));
      }
    } else {
      const text = await res.text();
      console.log('❌ Status:', res.status);
      console.log('❌ Content-Type:', contentType);
      console.log('❌ Response (first 200 chars):', text.substring(0, 200));
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

async function fetchRealPatientId() {
  try {
    const res = await fetch(`https://wwcgybgvfulotflitogu.supabase.co/rest/v1/patients?select=id&limit=1`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    const data = await res.json();
    return data[0]?.id || null;
  } catch (error) {
    console.error('❌ Failed to fetch patient ID:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📅 DATE INPUT DIAGNOSTIC TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  
  // Fetch real patient ID
  console.log('\n🔍 Fetching real patient ID from database...');
  TEST_PATIENT_ID = await fetchRealPatientId();
  
  if (!TEST_PATIENT_ID) {
    console.error('❌ Could not fetch patient ID. Exiting.');
    return;
  }
  
  console.log('✅ Using Patient ID:', TEST_PATIENT_ID, '(type:', typeof TEST_PATIENT_ID, ')');
  console.log('Backend:', BACKEND_URL);
  console.log('Service Role Key:', SERVICE_ROLE_KEY ? '✅ Found' : '❌ Not Found');
  
  // Test server connectivity
  console.log('\n🔍 Testing server connectivity...');
  try {
    const healthCheck = await fetch(`${BACKEND_URL}/api/health`);
    console.log('✅ Server is reachable (status:', healthCheck.status, ')');
  } catch (error) {
    console.error('❌ Cannot reach server. Is dev server running? (bun run dev)');
    console.error('   Error:', error.message);
    return;
  }

  // Test 1: ISO format (YYYY-MM-DD)
  await testDateFormat('ISO Format (YYYY-MM-DD)', {
    screening_date: '2025-01-21',
  });

  // Test 2: DD/MM/YYYY format
  await testDateFormat('DD/MM/YYYY Format', {
    screening_date: '21/01/2025',
  });

  // Test 3: MM/DD/YYYY format
  await testDateFormat('MM/DD/YYYY Format', {
    screening_date: '01/21/2025',
  });

  // Test 4: ISO DateTime
  await testDateFormat('ISO DateTime', {
    screening_date: '2025-01-21T10:30:00Z',
  });

  // Test 5: Multiple date fields
  await testDateFormat('Multiple Date Fields', {
    screening_date: '2025-01-21',
    date_of_birth: '1990-05-15',
    referral_date: '2025-01-22',
  });

  // Test 6: Empty string
  await testDateFormat('Empty String', {
    screening_date: '',
  });

  // Test 7: Null value
  await testDateFormat('Null Value', {
    screening_date: null,
  });

  // Test 8: Invalid date
  await testDateFormat('Invalid Date', {
    screening_date: 'invalid-date',
  });

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ All tests completed');
  console.log('═══════════════════════════════════════════════════════════════════════════');
}

runTests().catch(console.error);
