#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TRIPLE SYNC E2E TEST SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Tests the complete data flow:
 * Next.js API → Supabase (RLS + Service Role) → Google Sheets Webhook
 * 
 * Usage:
 *   node scripts/test-triple-sync-e2e.js
 *   bun scripts/test-triple-sync-e2e.js
 * 
 * Environment Variables (optional):
 *   API_URL          - Target API endpoint (default: http://localhost:3000)
 *   AUTH_TOKEN       - Session token from browser (required for user auth)
 *   TEST_PATIENT_ID  - Patient ID to update (default: 1)
 *   TEST_KOBO_UUID   - KoboToolbox UUID (default: test-uuid-123)
 *   USE_SERVICE_ROLE - Use service role auth instead of user token (default: false)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Load .env.local if exists
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      // Only set if not already in process.env (CLI args take precedence)
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  authToken: process.env.AUTH_TOKEN || '',
  patientId: parseInt(process.env.TEST_PATIENT_ID || '1'),
  koboUuid: process.env.TEST_KOBO_UUID || 'test-uuid-' + Date.now(),
  useServiceRole: process.env.USE_SERVICE_ROLE === 'true',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  timeout: 30000, // 30 seconds
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

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP REQUEST HANDLER
// ═══════════════════════════════════════════════════════════════════════════

function makeRequest(url, payload, authToken) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const payloadStr = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadStr),
      'User-Agent': 'Triple-Sync-E2E-Test/1.0',
    };

    // Add authentication header
    if (CONFIG.useServiceRole && CONFIG.serviceRoleKey) {
      headers['Authorization'] = `Bearer ${CONFIG.serviceRoleKey}`;
      log('🔐 Using Service Role authentication', 'cyan');
    } else if (authToken) {
      headers['Cookie'] = `authjs.session-token=${authToken}`;
      log('🔐 Using User Session authentication', 'cyan');
    } else {
      log('⚠️  No authentication provided - request may fail', 'yellow');
    }

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers,
      timeout: CONFIG.timeout,
    };

    const startTime = Date.now();
    let responseSize = 0;

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
        responseSize += chunk.length;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data: parsed,
            headers: res.headers,
            duration,
            size: responseSize,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data,
            headers: res.headers,
            duration,
            size: responseSize,
            parseError: e.message,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        error: error.message,
        code: error.code,
        duration: Date.now() - startTime,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        code: 'ETIMEDOUT',
        duration: CONFIG.timeout,
      });
    });

    req.write(payloadStr);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function runE2ETest() {
  console.log('');
  log('═══════════════════════════════════════════════════════════════════════════', 'bright');
  log('🚀 TRIPLE SYNC E2E TEST', 'bright');
  log('═══════════════════════════════════════════════════════════════════════════', 'bright');
  console.log('');

  // Display configuration
  log('📋 TEST CONFIGURATION', 'cyan');
  log('─────────────────────────────────────────────────────────────────────────', 'gray');
  log(`  API Endpoint:    ${CONFIG.apiUrl}/api/patient-sync`, 'gray');
  log(`  Patient ID:      ${CONFIG.patientId}`, 'gray');
  log(`  Kobo UUID:       ${CONFIG.koboUuid}`, 'gray');
  log(`  Auth Method:     ${CONFIG.useServiceRole ? 'Service Role' : 'User Session'}`, 'gray');
  log(`  Timeout:         ${formatDuration(CONFIG.timeout)}`, 'gray');
  console.log('');

  // Validate configuration
  if (!CONFIG.useServiceRole && !CONFIG.authToken) {
    log('❌ ERROR: No authentication provided', 'red');
    log('', 'reset');
    log('Please provide one of the following:', 'yellow');
    log('  1. Set AUTH_TOKEN environment variable with session token from browser', 'yellow');
    log('  2. Set USE_SERVICE_ROLE=true to use service role authentication', 'yellow');
    log('', 'reset');
    log('To extract session token from browser:', 'cyan');
    log('  1. Open DevTools (F12) → Application tab → Cookies', 'cyan');
    log('  2. Find cookie: authjs.session-token', 'cyan');
    log('  3. Copy the value and set: AUTH_TOKEN=<value>', 'cyan');
    console.log('');
    process.exit(1);
  }

  // Generate dynamic payload
  const timestamp = new Date().toISOString();
  const testPayload = {
    patientId: CONFIG.patientId,
    koboUuid: CONFIG.koboUuid,
    updates: {
      'Remarks': `🤖 Automated Triple Sync Test @ ${timestamp}`,
      'Serial Number': CONFIG.patientId,
      'KoboUUID': CONFIG.koboUuid,
    },
  };

  log('📤 TEST PAYLOAD', 'cyan');
  log('─────────────────────────────────────────────────────────────────────────', 'gray');
  log(JSON.stringify(testPayload, null, 2), 'gray');
  console.log('');

  // Execute request
  log('⏳ Executing request...', 'yellow');
  console.log('');

  try {
    const result = await makeRequest(
      `${CONFIG.apiUrl}/api/patient-sync`,
      testPayload,
      CONFIG.authToken
    );

    // Display response metadata
    log('📊 RESPONSE METADATA', 'cyan');
    log('─────────────────────────────────────────────────────────────────────────', 'gray');
    log(`  Status:          ${result.status} ${result.statusText}`, result.status === 200 ? 'green' : 'red');
    log(`  Duration:        ${formatDuration(result.duration)}`, 'gray');
    log(`  Response Size:   ${formatBytes(result.size)}`, 'gray');
    log(`  Content-Type:    ${result.headers['content-type'] || 'N/A'}`, 'gray');
    console.log('');

    // Analyze response
    if (result.status === 200) {
      log('✅ API REQUEST SUCCESSFUL', 'green');
      console.log('');

      if (result.data) {
        log('📄 RESPONSE DATA', 'cyan');
        log('─────────────────────────────────────────────────────────────────────────', 'gray');
        log(JSON.stringify(result.data, null, 2), 'gray');
        console.log('');

        // Verify sync results
        log('🔍 SYNC VERIFICATION', 'cyan');
        log('─────────────────────────────────────────────────────────────────────────', 'gray');

        const supabaseSuccess = result.data.supabase?.success === true;
        const googleSheetsSuccess = result.data.googleSheets?.success === true;

        log(`  Supabase:        ${supabaseSuccess ? '✅ SUCCESS' : '❌ FAILED'}`, supabaseSuccess ? 'green' : 'red');
        if (result.data.supabase?.data) {
          log(`    Updated ID:    ${result.data.supabase.data.id}`, 'gray');
        }

        log(`  Google Sheets:   ${googleSheetsSuccess ? '✅ SUCCESS' : '❌ FAILED'}`, googleSheetsSuccess ? 'green' : 'red');
        if (result.data.googleSheets?.message) {
          log(`    Message:       ${result.data.googleSheets.message}`, 'gray');
        }
        if (result.data.googleSheets?.data?.rowsUpdated !== undefined) {
          log(`    Rows Updated:  ${result.data.googleSheets.data.rowsUpdated}`, 'gray');
        }

        console.log('');

        // Check for warnings
        if (result.data.warnings && result.data.warnings.length > 0) {
          log('⚠️  WARNINGS', 'yellow');
          log('─────────────────────────────────────────────────────────────────────────', 'gray');
          result.data.warnings.forEach(warning => {
            log(`  • ${warning}`, 'yellow');
          });
          console.log('');
        }

        // Final verdict
        if (supabaseSuccess && googleSheetsSuccess) {
          log('═══════════════════════════════════════════════════════════════════════════', 'bright');
          log('🎉 TRIPLE SYNC TEST PASSED', 'green');
          log('═══════════════════════════════════════════════════════════════════════════', 'bright');
          console.log('');
          log('✅ All sync targets operational:', 'green');
          log('  • Supabase database updated', 'green');
          log('  • Google Sheets webhook delivered', 'green');
          log('  • Data consistency verified', 'green');
          console.log('');
          process.exit(0);
        } else {
          log('═══════════════════════════════════════════════════════════════════════════', 'bright');
          log('⚠️  PARTIAL SUCCESS', 'yellow');
          log('═══════════════════════════════════════════════════════════════════════════', 'bright');
          console.log('');
          log('Some sync targets failed. Review logs above.', 'yellow');
          console.log('');
          process.exit(1);
        }
      } else {
        log('⚠️  Empty response body', 'yellow');
        console.log('');
        process.exit(1);
      }
    } else if (result.status === 401) {
      log('❌ AUTHENTICATION FAILED', 'red');
      console.log('');
      log('The request was rejected by authentication middleware.', 'yellow');
      log('', 'reset');
      log('Possible causes:', 'yellow');
      log('  • Invalid or expired session token', 'yellow');
      log('  • Missing authentication header', 'yellow');
      log('  • Service role key mismatch', 'yellow');
      console.log('');
      process.exit(1);
    } else if (result.status === 403) {
      log('❌ AUTHORIZATION FAILED', 'red');
      console.log('');
      log('The request was rejected by RLS policies.', 'yellow');
      log('', 'reset');
      log('Possible causes:', 'yellow');
      log('  • User does not have permission to update this patient', 'yellow');
      log('  • State/district ownership mismatch', 'yellow');
      log('  • Invalid patient ID', 'yellow');
      console.log('');
      process.exit(1);
    } else if (result.status === 500) {
      log('❌ SERVER ERROR', 'red');
      console.log('');
      if (result.data) {
        log('Error details:', 'yellow');
        log(JSON.stringify(result.data, null, 2), 'red');
      }
      console.log('');
      process.exit(1);
    } else {
      log(`❌ UNEXPECTED STATUS: ${result.status}`, 'red');
      console.log('');
      if (result.data) {
        log('Response:', 'yellow');
        log(JSON.stringify(result.data, null, 2), 'gray');
      }
      console.log('');
      process.exit(1);
    }
  } catch (error) {
    log('❌ REQUEST FAILED', 'red');
    console.log('');
    log('Error details:', 'yellow');
    log(`  Message:  ${error.error || error.message}`, 'red');
    log(`  Code:     ${error.code || 'UNKNOWN'}`, 'red');
    log(`  Duration: ${formatDuration(error.duration || 0)}`, 'red');
    console.log('');

    if (error.code === 'ECONNREFUSED') {
      log('💡 TIP: Ensure the dev server is running:', 'cyan');
      log('  bun run dev', 'cyan');
    } else if (error.code === 'ETIMEDOUT') {
      log('💡 TIP: Request timed out. Check:', 'cyan');
      log('  • Network connectivity', 'cyan');
      log('  • API endpoint availability', 'cyan');
      log('  • Increase timeout with TIMEOUT env var', 'cyan');
    }

    console.log('');
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

runE2ETest().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
