// Test script for sheets-to-supabase health endpoint
const BASE_URL = 'http://localhost:3001';

async function testHealthEndpoint() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🏥 SHEETS-TO-SUPABASE HEALTH CHECK');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Test 1: GET health check
  console.log('📊 TEST 1: GET Health Check');
  try {
    const res = await fetch(`${BASE_URL}/api/sync/sheets-to-supabase`);
    const data = await res.json();
    console.log(`✅ Status: ${res.status}`);
    console.log(`✅ Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`❌ Error:`, error.message);
  }

  console.log('\n📊 TEST 2: POST with Invalid Secret (should return 401)');
  try {
    const res = await fetch(`${BASE_URL}/api/sync/sheets-to-supabase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-kobo-webhook-secret': 'wrong_secret',
      },
      body: JSON.stringify([{ kobo_uuid: 'test' }]),
    });
    const data = await res.json();
    console.log(`${res.status === 401 ? '✅' : '❌'} Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`❌ Error:`, error.message);
  }

  console.log('\n📊 TEST 3: POST with Valid Secret (should return 200)');
  try {
    const res = await fetch(`${BASE_URL}/api/sync/sheets-to-supabase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-kobo-webhook-secret': 'alliance_kobo_secure_2026',
      },
      body: JSON.stringify([
        {
          'KoboUUID(hidden)': 'test-health-' + Date.now(),
          'Inmate Name': 'Health Check Patient',
          'Age': '30',
          'Sex (Male/Female/TG)': 'Male',
        },
      ]),
    });
    const data = await res.json();
    console.log(`${res.status === 200 ? '✅' : '❌'} Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`❌ Error:`, error.message);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ HEALTH CHECK COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════════════');
}

testHealthEndpoint();
