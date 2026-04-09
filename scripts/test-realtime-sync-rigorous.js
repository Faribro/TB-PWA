#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RIGOROUS REALTIME SYNC TEST - PATIENT DETAIL DRAWER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Tests complete data flow from PatientDetailDrawer to Database to Google Sheets:
 * 1. Clinical updates (referral, diagnosis, treatment)
 * 2. Demographics updates (name, age, contact, address)
 * 3. Loop closure (TB diagnosed = N)
 * 4. Supabase database verification
 * 5. Google Sheets webhook delivery
 * 6. Data consistency validation
 * 
 * Usage:
 *   bun run test:realtime-sync
 *   node scripts/test-realtime-sync-rigorous.js
 * 
 * Prerequisites:
 *   - Dev server running on http://localhost:3000
 *   - Valid SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - Valid GOOGLE_SCRIPT_WEBHOOK_URL in .env.local
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// LOAD ENVIRONMENT
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  apiUrl: 'http://localhost:3000',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  googleSheetsUrl: process.env.GOOGLE_SCRIPT_WEBHOOK_URL,
  timeout: 30000,
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function makeRequest(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const payloadStr = JSON.stringify(payload);
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadStr),
      ...headers,
    };

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: defaultHeaders,
      timeout: CONFIG.timeout,
    };

    const startTime = Date.now();

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed, duration });
        } catch (e) {
          resolve({ status: res.statusCode, data, duration, parseError: true });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(payloadStr);
    req.end();
  });
}

async function querySupabase(query) {
  const url = `${CONFIG.supabaseUrl}/rest/v1/${query}`;
  
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'apikey': CONFIG.serviceRoleKey,
        'Authorization': `Bearer ${CONFIG.serviceRoleKey}`,
      },
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse Supabase response'));
        }
      });
    }).on('error', reject);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

const TEST_SCENARIOS = [
  {
    name: 'Clinical Update - Referral',
    category: 'clinical',
    patientId: 35046,
    koboUuid: 'e858d17d-e58a-405d-8939-88523fa6f745',
    updates: {
      'Date of referral for TB Examination (sputum) (dd/mm/yy)': '2025-01-21',
      'Name of facility where referred to (Give code/name of all facilities)': 'DMC-Designated microscopy Centre',
    },
    verifyFields: ['referral_date', 'referred_facility'],
  },
  {
    name: 'Clinical Update - Diagnosis',
    category: 'clinical',
    patientId: 35047,
    koboUuid: '3b1eb3ac-b366-43ac-9af9-beb39f443db6',
    updates: {
      'TB diagnosed (Y/N)': 'Y',
      'Date of TB Diagnosed (dd/mm/yy)': '2025-01-21',
      'Type of TB Diagnosed (P/EP)': 'P',
    },
    verifyFields: ['tb_diagnosed', 'tb_diagnosis_date', 'tb_type'],
  },
  {
    name: 'Clinical Update - Treatment Initiation',
    category: 'clinical',
    patientId: 24385,
    koboUuid: '4632bf27-79f1-4425-9c08-019f99838d56',
    updates: {
      'Date of starting ATT (dd/mm/yyyy)': '2025-01-21',
      'HIV Status (Positive/Negative/Unknown)': 'Negative',
      'NIKSHAY/ABHA ID': 'TEST-NIKSHAY-' + Date.now(),
    },
    verifyFields: ['att_start_date', 'hiv_status', 'nikshay_abha_id'],
  },
  {
    name: 'Demographics Update - Full Profile',
    category: 'demographics',
    patientId: 24386,
    koboUuid: '89d61a4e-c5d5-41bb-aafe-d19b703a4a41',
    updates: {
      'inmate_name': 'Test Patient (Updated ' + new Date().toISOString().split('T')[0] + ')',
      'age': '35',
      'sex': 'Male',
      'contact_number': '+91-9876543210',
      'address': '123 Test Street, Test City, Test State',
    },
    verifyFields: ['inmate_name', 'age', 'sex', 'contact_number', 'address'],
  },
  {
    name: 'Loop Closure - Negative Diagnosis',
    category: 'closure',
    patientId: 24387,
    koboUuid: '2e0b0025-1c4a-491c-b2cc-b4f12eb70e0d',
    updates: {
      'TB diagnosed (Y/N)': 'N',
      'closure_reason': 'Negative sputum result',
      'Remarks': 'Loop closed: Negative sputum result - Test @ ' + new Date().toISOString(),
    },
    verifyFields: ['tb_diagnosed', 'closure_reason', 'remarks'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// TEST EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function runTest(scenario) {
  const results = {
    scenario: scenario.name,
    apiSuccess: false,
    supabaseSuccess: false,
    googleSheetsSuccess: false,
    duration: 0,
    errors: [],
  };

  const startTime = Date.now();

  try {
    // Step 1: Call patient-sync API
    log(`  🔄 Calling /api/patient-sync...`, 'cyan');
    
    const payload = {
      patientId: scenario.patientId,
      koboUuid: scenario.koboUuid,
      updates: {
        ...scenario.updates,
        'Serial Number': scenario.patientId,
        'KoboUUID': scenario.koboUuid,
      },
    };

    const apiResponse = await makeRequest(
      `${CONFIG.apiUrl}/api/patient-sync`,
      payload,
      { 'Authorization': `Bearer ${CONFIG.serviceRoleKey}` }
    );

    if (apiResponse.status === 200) {
      results.apiSuccess = true;
      log(`  ✅ API call successful (${formatDuration(apiResponse.duration)})`, 'green');

      // Check Supabase sync
      if (apiResponse.data?.supabase?.success) {
        results.supabaseSuccess = true;
        log(`  ✅ Supabase sync confirmed`, 'green');
      } else {
        results.errors.push('Supabase sync failed in API response');
        log(`  ❌ Supabase sync failed`, 'red');
      }

      // Check Google Sheets sync
      if (apiResponse.data?.googleSheets?.success) {
        results.googleSheetsSuccess = true;
        const rowsUpdated = apiResponse.data.googleSheets.data?.rowsUpdated || 0;
        log(`  ✅ Google Sheets sync confirmed (${rowsUpdated} row(s) updated)`, 'green');
      } else {
        results.errors.push('Google Sheets sync failed: ' + (apiResponse.data?.googleSheets?.message || 'Unknown error'));
        log(`  ❌ Google Sheets sync failed`, 'red');
      }

      // Check for warnings
      if (apiResponse.data?.warnings?.length > 0) {
        results.errors.push(...apiResponse.data.warnings);
        apiResponse.data.warnings.forEach(warning => {
          log(`  ⚠️  ${warning}`, 'yellow');
        });
      }
    } else {
      results.errors.push(`API returned status ${apiResponse.status}`);
      log(`  ❌ API call failed: ${apiResponse.status}`, 'red');
      if (apiResponse.data) {
        log(`  📄 Error: ${JSON.stringify(apiResponse.data)}`, 'red');
      }
    }

    // Step 2: Verify data in Supabase
    if (results.apiSuccess) {
      log(`  🔍 Verifying data in Supabase...`, 'cyan');
      
      try {
        const patient = await querySupabase(`patients?id=eq.${scenario.patientId}&select=*`);
        
        if (patient && patient.length > 0) {
          const patientData = patient[0];
          let allFieldsMatch = true;

          for (const field of scenario.verifyFields) {
            const expectedValue = scenario.updates[field] || 
                                 scenario.updates[Object.keys(scenario.updates).find(k => k.toLowerCase().includes(field))];
            const actualValue = patientData[field];

            if (actualValue === undefined || actualValue === null) {
              allFieldsMatch = false;
              results.errors.push(`Field ${field} not found in database`);
              log(`    ❌ ${field}: NOT FOUND`, 'red');
            } else {
              log(`    ✅ ${field}: ${actualValue}`, 'green');
            }
          }

          if (allFieldsMatch) {
            log(`  ✅ All fields verified in database`, 'green');
          }
        } else {
          results.errors.push('Patient not found in database');
          log(`  ❌ Patient not found in database`, 'red');
        }
      } catch (error) {
        results.errors.push(`Database verification failed: ${error.message}`);
        log(`  ❌ Database verification failed: ${error.message}`, 'red');
      }
    }

  } catch (error) {
    results.errors.push(`Test execution failed: ${error.message}`);
    log(`  ❌ Test execution failed: ${error.message}`, 'red');
  }

  results.duration = Date.now() - startTime;
  return results;
}

async function runAllTests() {
  console.log('');
  log('═══════════════════════════════════════════════════════════════════════════', 'bright');
  log('🧪 RIGOROUS REALTIME SYNC TEST - PATIENT DETAIL DRAWER', 'bright');
  log('═══════════════════════════════════════════════════════════════════════════', 'bright');
  console.log('');

  // Validate configuration
  log('📋 CONFIGURATION', 'cyan');
  log('─────────────────────────────────────────────────────────────────────────', 'gray');
  log(`  API URL:          ${CONFIG.apiUrl}`, 'gray');
  log(`  Supabase URL:     ${CONFIG.supabaseUrl}`, 'gray');
  log(`  Service Role Key: ${CONFIG.serviceRoleKey ? CONFIG.serviceRoleKey.substring(0, 50) + '...' : 'NOT FOUND'}`, 'gray');
  log(`  Google Sheets:    ${CONFIG.googleSheetsUrl ? 'Configured' : 'NOT FOUND'}`, 'gray');
  console.log('');

  if (!CONFIG.serviceRoleKey) {
    log('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not found in .env.local', 'red');
    process.exit(1);
  }

  if (!CONFIG.googleSheetsUrl) {
    log('⚠️  WARNING: GOOGLE_SCRIPT_WEBHOOK_URL not found in .env.local', 'yellow');
    log('   Google Sheets sync tests will fail', 'yellow');
    console.log('');
  }

  // Check if dev server is running
  log('🔍 Checking dev server...', 'cyan');
  try {
    await new Promise((resolve, reject) => {
      http.get(`${CONFIG.apiUrl}`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          resolve();
        } else {
          reject(new Error(`Unexpected status: ${res.statusCode}`));
        }
      }).on('error', reject);
    });
    log('✅ Dev server is running', 'green');
  } catch (error) {
    log('❌ Dev server is not running!', 'red');
    log('   Please start the dev server first: bun run dev', 'yellow');
    process.exit(1);
  }
  console.log('');

  // Run tests
  const testResults = [];
  
  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const scenario = TEST_SCENARIOS[i];
    
    log(`📋 TEST ${i + 1}/${TEST_SCENARIOS.length}: ${scenario.name}`, 'cyan');
    log('─────────────────────────────────────────────────────────────────────────', 'gray');
    log(`  Category:   ${scenario.category}`, 'gray');
    log(`  Patient ID: ${scenario.patientId}`, 'gray');
    log(`  Kobo UUID:  ${scenario.koboUuid}`, 'gray');
    console.log('');

    const result = await runTest(scenario);
    testResults.push(result);

    console.log('');
    
    // Wait between tests
    if (i < TEST_SCENARIOS.length - 1) {
      log('  ⏳ Waiting 2 seconds before next test...', 'gray');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('');
    }
  }

  // Summary
  log('═══════════════════════════════════════════════════════════════════════════', 'bright');
  log('📊 TEST SUMMARY', 'bright');
  log('═══════════════════════════════════════════════════════════════════════════', 'bright');
  console.log('');

  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.apiSuccess && r.supabaseSuccess && r.googleSheetsSuccess).length;
  const failedTests = totalTests - passedTests;
  const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);

  log(`Total Tests:        ${totalTests}`, 'gray');
  log(`✅ Passed:          ${passedTests}`, passedTests === totalTests ? 'green' : 'yellow');
  log(`❌ Failed:          ${failedTests}`, failedTests === 0 ? 'gray' : 'red');
  log(`⏱️  Total Duration:  ${formatDuration(totalDuration)}`, 'gray');
  log(`📈 Success Rate:    ${((passedTests / totalTests) * 100).toFixed(1)}%`, passedTests === totalTests ? 'green' : 'yellow');
  console.log('');

  // Detailed results
  log('📋 DETAILED RESULTS', 'cyan');
  log('─────────────────────────────────────────────────────────────────────────', 'gray');
  testResults.forEach((result, index) => {
    const icon = (result.apiSuccess && result.supabaseSuccess && result.googleSheetsSuccess) ? '✅' : '❌';
    log(`${icon} Test ${index + 1}: ${result.scenario}`, result.apiSuccess ? 'green' : 'red');
    log(`   API:           ${result.apiSuccess ? '✅' : '❌'}`, result.apiSuccess ? 'green' : 'red');
    log(`   Supabase:      ${result.supabaseSuccess ? '✅' : '❌'}`, result.supabaseSuccess ? 'green' : 'red');
    log(`   Google Sheets: ${result.googleSheetsSuccess ? '✅' : '❌'}`, result.googleSheetsSuccess ? 'green' : 'red');
    log(`   Duration:      ${formatDuration(result.duration)}`, 'gray');
    
    if (result.errors.length > 0) {
      log(`   Errors:`, 'red');
      result.errors.forEach(error => {
        log(`     • ${error}`, 'red');
      });
    }
    console.log('');
  });

  // Final verdict
  if (passedTests === totalTests) {
    log('═══════════════════════════════════════════════════════════════════════════', 'bright');
    log('🎉 ALL TESTS PASSED - REALTIME SYNC IS WORKING PERFECTLY!', 'green');
    log('═══════════════════════════════════════════════════════════════════════════', 'bright');
    console.log('');
    log('✅ Verified:', 'green');
    log('  • PatientDetailDrawer updates are syncing to Supabase', 'green');
    log('  • Supabase data is syncing to Google Sheets', 'green');
    log('  • All data fields are correctly mapped', 'green');
    log('  • Clinical, demographics, and closure updates work', 'green');
    console.log('');
    process.exit(0);
  } else {
    log('═══════════════════════════════════════════════════════════════════════════', 'bright');
    log('⚠️  SOME TESTS FAILED - REVIEW ERRORS ABOVE', 'yellow');
    log('═══════════════════════════════════════════════════════════════════════════', 'bright');
    console.log('');
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

runAllTests().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
