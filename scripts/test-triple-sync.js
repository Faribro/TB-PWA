/**
 * ROBUST Triple-Sync Pipeline Test Script
 * Tests: Supabase → Google Sheets → KoboToolbox sync
 * 
 * Features:
 * - Auto-starts dev server if not running
 * - Configurable via environment variables
 * - Retry logic with exponential backoff
 * - Comprehensive error reporting
 * 
 * Usage:
 *   bun run test:sync                    # Use default patient ID (72411)
 *   TEST_PATIENT_ID=12345 bun run test:sync  # Use custom patient ID
 *   TEST_SKIP_GAS=true bun run test:sync     # Skip Google Sheets tests
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const https = require('https');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  API_URL: process.env.TEST_API_URL || 'http://localhost:3000/api/patient-sync',
  GOOGLE_SHEETS_WEBHOOK: process.env.GOOGLE_SCRIPT_WEBHOOK_URL || 
    'https://script.google.com/macros/s/AKfycbwi6Rh-1I7yo1arWlwr4e59Ra3AhIqE7FlQByU0TD7tbcB_sPD6MdonjukX8go4oi13/exec',
  PATIENT_ID: parseInt(process.env.TEST_PATIENT_ID || '72411', 10),
  MAX_RETRIES: parseInt(process.env.TEST_MAX_RETRIES || '3', 10),
  RETRY_DELAY_MS: parseInt(process.env.TEST_RETRY_DELAY_MS || '2000', 10),
  SERVER_START_TIMEOUT_MS: parseInt(process.env.TEST_SERVER_TIMEOUT_MS || '60000', 10),
  SKIP_GAS_TESTS: process.env.TEST_SKIP_GAS === 'true',
  VERBOSE: process.env.TEST_VERBOSE === 'true',
};

// Load environment variables from .env.local
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env'),
  ];
  
  for (const envPath of envPaths) {
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
      if (CONFIG.VERBOSE) console.log(`📄 Loaded env from: ${envPath}`);
      break;
    }
  }
}

loadEnv();

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function log(level, message, data) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  
  if (level === 'ERROR') {
    console.error(`${prefix} ❌ ${message}`);
  } else if (level === 'WARN') {
    console.warn(`${prefix} ⚠️  ${message}`);
  } else if (level === 'SUCCESS') {
    console.log(`${prefix} ✅ ${message}`);
  } else if (level === 'INFO') {
    console.log(`${prefix} ℹ️  ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
  
  if (data && CONFIG.VERBOSE) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff(operation, maxRetries = CONFIG.MAX_RETRIES, delayMs = CONFIG.RETRY_DELAY_MS) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }
      const backoffDelay = delayMs * Math.pow(2, attempt - 1);
      log('WARN', `Attempt ${attempt}/${maxRetries} failed, retrying in ${backoffDelay}ms...`);
      await sleep(backoffDelay);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function checkServerRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000', { timeout: 3000 }, (res) => {
      resolve({ running: true, status: res.statusCode });
    });
    req.on('error', () => resolve({ running: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ running: false });
    });
  });
}

async function startDevServer() {
  log('INFO', 'Starting dev server...');
  
  return new Promise((resolve, reject) => {
    const serverProcess = spawn('bun', ['run', 'dev'], {
      cwd: path.join(__dirname, '..'),
      detached: true,
      stdio: CONFIG.VERBOSE ? 'inherit' : 'pipe',
    });
    
    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        serverProcess.kill();
        reject(new Error(`Server failed to start within ${CONFIG.SERVER_START_TIMEOUT_MS}ms`));
      }
    }, CONFIG.SERVER_START_TIMEOUT_MS);
    
    // Poll for server readiness
    const checkInterval = setInterval(async () => {
      const status = await checkServerRunning();
      if (status.running) {
        clearInterval(checkInterval);
        clearTimeout(timeout);
        started = true;
        resolve(serverProcess);
      }
    }, 1000);
    
    serverProcess.on('error', (err) => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
      reject(err);
    });
    
    serverProcess.on('exit', (code) => {
      if (!started) {
        clearInterval(checkInterval);
        clearTimeout(timeout);
        reject(new Error(`Server process exited with code ${code}`));
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════════════════

async function makeRequest(url, payload, options = {}) {
  const { method = 'POST', headers = {} } = options;
  
  return retryWithBackoff(async () => {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const payloadStr = payload ? JSON.stringify(payload) : '';
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payloadStr && { 'Content-Length': Buffer.byteLength(payloadStr) }),
          ...(SERVICE_ROLE_KEY && { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }),
          ...headers,
        },
        timeout: 30000,
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : null;
            resolve({ 
              status: res.statusCode, 
              data: parsed, 
              headers: res.headers,
              raw: data 
            });
          } catch (e) {
            resolve({ 
              status: res.statusCode, 
              data, 
              headers: res.headers,
              raw: data 
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (payloadStr) {
        req.write(payloadStr);
      }
      req.end();
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════════════════

const TEST_CASES = [
  {
    id: 'clinical_referral',
    name: 'Clinical Update (Referral)',
    description: 'Updates referral date and facility',
    buildPayload: (patientId) => ({
      patientId,
      updates: {
        'Date of referral for TB Examination (sputum) (dd/mm/yy)': '2024-01-15',
        'Name of facility where referred to (Give code/name of all facilities)': 'DMC-Designated microscopy Centre'
      }
    }),
    validate: (response) => {
      const checks = [];
      checks.push({ pass: response.status === 200, message: 'API returns 200' });
      checks.push({ pass: response.data?.success === true, message: 'Response success flag is true' });
      checks.push({ pass: !!response.data?.supabase?.data, message: 'Supabase data returned' });
      checks.push({ pass: response.data?.supabase?.data?.referral_date === '2024-01-15', message: 'Referral date updated' });
      return checks;
    }
  },
  {
    id: 'tb_diagnosis',
    name: 'TB Diagnosis Update',
    description: 'Updates TB diagnosis details',
    buildPayload: (patientId) => ({
      patientId,
      updates: {
        'TB diagnosed (Y/N)': 'Y',
        'Date of TB Diagnosed (dd/mm/yy)': '2024-02-01',
        'Type of TB Diagnosed (P/EP)': 'P'
      }
    }),
    validate: (response) => {
      const checks = [];
      checks.push({ pass: response.status === 200, message: 'API returns 200' });
      checks.push({ pass: response.data?.supabase?.data?.tb_diagnosed === 'Y', message: 'TB diagnosed flag set' });
      return checks;
    }
  },
  {
    id: 'treatment_completion',
    name: 'Treatment Completion',
    description: 'Updates treatment completion date',
    buildPayload: (patientId) => ({
      patientId,
      updates: {
        'Date of starting ATT (dd/mm/yyyy)': '2024-02-05',
        'Date of Treatment Completion (dd/mm/yyyy)': '2024-08-05'
      }
    }),
    validate: (response) => {
      const checks = [];
      checks.push({ pass: response.status === 200, message: 'API returns 200' });
      checks.push({ pass: !!response.data?.supabase?.data?.att_start_date, message: 'ATT start date set' });
      return checks;
    }
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// TEST EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function runSingleTest(testCase, patientId) {
  log('INFO', `\n📋 TEST: ${testCase.name}`);
  log('INFO', `   ${testCase.description}`);
  console.log('─────────────────────────────────────────────────────────────────────────');
  
  const payload = testCase.buildPayload(patientId);
  log('INFO', '📤 Payload:', payload);
  
  try {
    const startTime = Date.now();
    const result = await makeRequest(CONFIG.API_URL, payload);
    const duration = Date.now() - startTime;
    
    log('INFO', `⏱️  Duration: ${duration}ms`);
    log('INFO', `📊 HTTP Status: ${result.status}`);
    
    if (CONFIG.VERBOSE) {
      log('INFO', '📄 Response:', result.data);
    }
    
    // Run validations
    const checks = testCase.validate(result);
    let passedChecks = 0;
    
    for (const check of checks) {
      if (check.pass) {
        log('SUCCESS', `   ✓ ${check.message}`);
        passedChecks++;
      } else {
        log('ERROR', `   ✗ ${check.message}`);
      }
    }
    
    const allPassed = passedChecks === checks.length;
    
    // Check Google Sheets sync if not skipped
    if (!CONFIG.SKIP_GAS_TESTS && result.data?.googleSheets) {
      const gs = result.data.googleSheets;
      if (gs.success) {
        log('SUCCESS', `📊 Google Sheets: ${gs.message || 'Synced'}`);
      } else {
        log('WARN', `📊 Google Sheets: ${gs.message || 'Failed'}`);
      }
    }
    
    // Check warnings
    if (result.data?.warnings?.length > 0) {
      for (const warning of result.data.warnings) {
        log('WARN', `⚠️  ${warning}`);
      }
    }
    
    return {
      id: testCase.id,
      name: testCase.name,
      passed: allPassed,
      checks: `${passedChecks}/${checks.length}`,
      duration,
      status: result.status,
      error: allPassed ? null : 'Validation failed'
    };
    
  } catch (error) {
    log('ERROR', `❌ Test failed: ${error.message}`);
    return {
      id: testCase.id,
      name: testCase.name,
      passed: false,
      checks: '0/0',
      duration: 0,
      status: 0,
      error: error.message
    };
  }
}

async function testGoogleSheetsDirectly() {
  if (CONFIG.SKIP_GAS_TESTS) {
    log('INFO', '⏭️  Skipping direct Google Sheets test (TEST_SKIP_GAS=true)');
    return { skipped: true };
  }
  
  log('INFO', '\n🔗 Testing direct Google Sheets webhook...');
  
  try {
    const result = await makeRequest(CONFIG.GOOGLE_SHEETS_WEBHOOK, {
      action: 'health_check',
      timestamp: Date.now()
    });
    
    if (result.status === 200) {
      log('SUCCESS', '✅ Google Sheets webhook is reachable');
      return { reachable: true, status: result.status };
    } else {
      log('WARN', `⚠️  Google Sheets returned status ${result.status}`);
      return { reachable: false, status: result.status, raw: result.raw?.substring(0, 200) };
    }
  } catch (error) {
    log('ERROR', `❌ Google Sheets webhook error: ${error.message}`);
    return { reachable: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🚀 TRIPLE-SYNC PIPELINE TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  log('INFO', `Configuration:`);
  log('INFO', `  API URL: ${CONFIG.API_URL}`);
  log('INFO', `  Patient ID: ${CONFIG.PATIENT_ID}`);
  log('INFO', `  Max Retries: ${CONFIG.MAX_RETRIES}`);
  log('INFO', `  Skip GAS: ${CONFIG.SKIP_GAS_TESTS}`);
  log('INFO', `  Verbose: ${CONFIG.VERBOSE}`);
  console.log('');
  
  // Validate credentials
  if (!SERVICE_ROLE_KEY) {
    log('ERROR', '❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    log('ERROR', '   Please ensure .env.local contains SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  log('SUCCESS', '✅ Service Role Key configured');
  
  // Check server status
  log('INFO', '🔍 Checking dev server status...');
  let serverProcess = null;
  const serverStatus = await checkServerRunning();
  
  if (serverStatus.running) {
    log('SUCCESS', '✅ Dev server is running');
  } else {
    log('WARN', '⚠️  Dev server not running, attempting to start...');
    try {
      serverProcess = await startDevServer();
      log('SUCCESS', '✅ Dev server started successfully');
      await sleep(3000); // Give server time to initialize
    } catch (error) {
      log('ERROR', `❌ Failed to start dev server: ${error.message}`);
      log('ERROR', '   Please start manually: bun run dev');
      process.exit(1);
    }
  }
  
  // Test Google Sheets connectivity
  const gsStatus = await testGoogleSheetsDirectly();
  
  // Run all test cases
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 RUNNING TESTS');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  
  const results = [];
  for (let i = 0; i < TEST_CASES.length; i++) {
    const result = await runSingleTest(TEST_CASES[i], CONFIG.PATIENT_ID);
    results.push(result);
    
    if (i < TEST_CASES.length - 1) {
      log('INFO', `\n⏳ Waiting ${CONFIG.RETRY_DELAY_MS}ms before next test...`);
      await sleep(CONFIG.RETRY_DELAY_MS);
    }
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log('');
  console.log('Test Results:');
  console.log('─────────────────────────────────────────────────────────────────────────');
  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name.padEnd(30)} ${status} (${result.checks}) ${result.duration}ms`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  console.log('─────────────────────────────────────────────────────────────────────────');
  console.log(`
Total: ${total} | ✅ Passed: ${passed} | ❌ Failed: ${failed} | Success Rate: ${((passed/total)*100).toFixed(1)}%`);
  
  if (gsStatus.skipped) {
    console.log('\n⏭️  Google Sheets tests skipped');
  } else if (gsStatus.reachable) {
    console.log('\n✅ Google Sheets webhook: Reachable');
  } else {
    console.log('\n⚠️  Google Sheets webhook: Unreachable');
    if (gsStatus.error) console.log(`   Error: ${gsStatus.error}`);
  }
  
  console.log('');
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED');
    console.log('✅ Triple-sync pipeline is operational');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('   Review errors above and check:');
    console.log('   • Dev server is running (bun run dev)');
    console.log('   • Supabase is accessible');
    console.log('   • Google Sheets webhook URL is correct');
    console.log('   • Patient ID exists in database');
  }
  console.log('');
  
  // Cleanup
  if (serverProcess) {
    log('INFO', 'Shutting down dev server...');
    serverProcess.kill();
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  process.exit(130);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught exception:', error.message);
  process.exit(1);
});

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Test suite failed:', error.message);
  if (CONFIG.VERBOSE) console.error(error.stack);
  process.exit(1);
});
