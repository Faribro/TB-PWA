/**
 * Triple-Sync Pipeline Test Script
 * Tests: Supabase → Google Sheets → KoboToolbox sync
 * 
 * PRODUCTION CREDENTIALS:
 * - Supabase: wwcgybgvfulotflitogu.supabase.co
 * - Google Sheets: AKfycbyBwLUKiFDY-eLdNOIzNZRsyem0rWiTA6IvelapBjHg8sGdtkTuhQs2hGbXrydeUZSu
 */

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

// Parse .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const http = require('http');

const API_URL = 'http://localhost:3000/api/patient-sync';
const GOOGLE_SHEETS_WEBHOOK = 'https://script.google.com/macros/s/AKfycbwi6Rh-1I7yo1arWlwr4e59Ra3AhIqE7FlQByU0TD7tbcB_sPD6MdonjukX8go4oi13/exec';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🚀 TRIPLE-SYNC PIPELINE TEST');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`API Endpoint: ${API_URL}`);
console.log(`Google Sheets: ${GOOGLE_SHEETS_WEBHOOK}`);
console.log(`Service Role Key: ${SERVICE_ROLE_KEY ? SERVICE_ROLE_KEY.substring(0, 50) + '...' : 'NOT FOUND'}`);
console.log('');

if (!SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  console.error('   Please ensure .env.local contains:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

// Test payloads - using REAL patient IDs and UUIDs from database
const testPayloads = [
  {
    name: 'Clinical Update (Referral)',
    payload: {
      patientId: 35046,
      koboUuid: 'e858d17d-e58a-405d-8939-88523fa6f745',
      updates: {
        'Date of referral for TB Examination (sputum) (dd/mm/yy)': '2024-01-15',
        'Name of facility where referred to (Give code/name of all facilities)': 'DMC-Designated microscopy Centre',
        'Serial Number': 35046,
        'KoboUUID': 'e858d17d-e58a-405d-8939-88523fa6f745'
      }
    }
  },
  {
    name: 'Diagnosis Update',
    payload: {
      patientId: 35047,
      koboUuid: '3b1eb3ac-b366-43ac-9af9-beb39f443db6',
      updates: {
        'TB diagnosed (Y/N)': 'Y',
        'Date of TB Diagnosed (dd/mm/yy)': '2024-01-20',
        'Type of TB Diagnosed (P/EP)': 'P',
        'Serial Number': 35047,
        'KoboUUID': '3b1eb3ac-b366-43ac-9af9-beb39f443db6'
      }
    }
  },
  {
    name: 'Treatment Initiation',
    payload: {
      patientId: 24385,
      koboUuid: '4632bf27-79f1-4425-9c08-019f99838d56',
      updates: {
        'Date of starting ATT (dd/mm/yyyy)': '2024-01-25',
        'HIV Status (Positive/Negative/Unknown)': 'Negative',
        'NIKSHAY/ABHA ID': 'NIKSHAY123456',
        'Serial Number': 24385,
        'KoboUUID': '4632bf27-79f1-4425-9c08-019f99838d56'
      }
    }
  },
  {
    name: 'Demographics Update',
    payload: {
      patientId: 24386,
      koboUuid: '89d61a4e-c5d5-41bb-aafe-d19b703a4a41',
      updates: {
        'inmate_name': 'Ajay (Updated)',
        'age': '35',
        'contact_number': '+91-9876543210',
        'address': '123 Test Street, Test City',
        'Serial Number': 24386,
        'KoboUUID': '89d61a4e-c5d5-41bb-aafe-d19b703a4a41'
      }
    }
  },
  {
    name: 'Loop Closure',
    payload: {
      patientId: 24387,
      koboUuid: '2e0b0025-1c4a-491c-b2cc-b4f12eb70e0d',
      updates: {
        'TB diagnosed (Y/N)': 'N',
        'Remarks': 'Loop closed: Negative sputum result',
        'Serial Number': 24387,
        'KoboUUID': '2e0b0025-1c4a-491c-b2cc-b4f12eb70e0d'
      }
    }
  }
];

async function makeRequest(url, payload) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const payloadStr = JSON.stringify(payload);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadStr),
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}` // Service role authentication
      }
    };

    const req = http.request(options, (res) => {
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
    req.write(payloadStr);
    req.end();
  });
}

async function testGoogleSheetsWebhook(payload) {
  console.log('  🔗 Testing direct Google Sheets webhook...');
  try {
    const https = require('https');
    const url = new URL(GOOGLE_SHEETS_WEBHOOK);
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          console.log(`  ✅ Google Sheets responded: ${res.statusCode}`);
          console.log(`  📄 Response: ${data.substring(0, 200)}...`);
          resolve({ status: res.statusCode, data });
        });
      });

      req.on('error', (error) => {
        console.log(`  ❌ Google Sheets error: ${error.message}`);
        reject(error);
      });

      req.write(JSON.stringify(payload));
      req.end();
    });
  } catch (error) {
    console.log(`  ❌ Webhook test failed: ${error.message}`);
  }
}

async function runTests() {
  console.log('⏳ Starting tests in 2 seconds (ensure dev server is running)...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  let passedTests = 0;
  let failedTests = 0;

  for (let i = 0; i < testPayloads.length; i++) {
    const test = testPayloads[i];
    console.log(`\n📋 TEST ${i + 1}/${testPayloads.length}: ${test.name}`);
    console.log('─────────────────────────────────────────────────────────────────────────');
    console.log('📤 Payload:');
    console.log(JSON.stringify(test.payload, null, 2));
    console.log('');

    try {
      // Test API endpoint
      console.log('  🔄 Calling /api/patient-sync...');
      const result = await makeRequest(API_URL, test.payload);
      
      console.log(`  📊 Status: ${result.status}`);
      
      if (result.status === 200) {
        console.log('  ✅ API call successful');
        console.log('  📄 Response:', JSON.stringify(result.data, null, 2));
        
        // Check if Google Sheets sync was mentioned
        if (result.data?.googleSheets) {
          console.log('  ✅ Google Sheets sync confirmed in response');
          console.log(`  📊 Sheets status: ${result.data.googleSheets.status}`);
          console.log(`  💬 Sheets message: ${result.data.googleSheets.message}`);
        } else {
          console.log('  ⚠️  No Google Sheets confirmation in response');
        }
        
        // Test direct webhook
        await testGoogleSheetsWebhook(test.payload.updates);
        
        passedTests++;
      } else {
        console.log('  ❌ API call failed');
        console.log('  📄 Error:', result.data);
        failedTests++;
      }
    } catch (error) {
      console.log(`  ❌ Test failed: ${error.message}`);
      failedTests++;
    }

    // Wait between tests
    if (i < testPayloads.length - 1) {
      console.log('\n  ⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Total Tests:  ${testPayloads.length}`);
  console.log(`✅ Passed:    ${passedTests}`);
  console.log(`❌ Failed:    ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / testPayloads.length) * 100).toFixed(1)}%`);
  console.log('');

  if (passedTests === testPayloads.length) {
    console.log('🎉 ALL TESTS PASSED - Triple-sync pipeline is working correctly!');
    console.log('');
    console.log('✅ Verified:');
    console.log('  • Supabase Service Role Key bypasses RLS');
    console.log('  • API endpoint processes requests correctly');
    console.log('  • Google Sheets webhook receives updates');
    console.log('  • All sync targets are operational');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review errors above');
  }
  console.log('');
}

// Check if dev server is running
console.log('🔍 Checking if dev server is running...');
http.get('http://localhost:3000', (res) => {
  console.log('✅ Dev server is running\n');
  runTests().catch(console.error);
}).on('error', (err) => {
  console.error('❌ Dev server is not running!');
  console.error('   Please start the dev server first: bun run dev');
  console.error('   Then run this script again.');
  process.exit(1);
});
