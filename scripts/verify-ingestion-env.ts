/**
 * PRE-FLIGHT VERIFICATION SCRIPT
 * Tests all environment variables and dependencies for Data Ingestion Engine
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Redis } from '@upstash/redis';
import { Client as QStashClient } from '@upstash/qstash';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: TestResult[] = [];

// ============================================================================
// A. CORE DEPENDENCY AUDIT
// ============================================================================

async function testDependencies() {
  log('\n' + '='.repeat(80), colors.cyan);
  log('A. CORE DEPENDENCY AUDIT', colors.bold);
  log('='.repeat(80), colors.cyan);

  const requiredPackages = [
    { name: 'sharp', module: 'sharp' },
    { name: 'pdf-parse-fork', module: 'pdf-parse-fork' },
    { name: 'exceljs', module: 'exceljs' },
    { name: '@upstash/redis', module: '@upstash/redis' },
    { name: '@upstash/qstash', module: '@upstash/qstash' },
    { name: 'date-fns', module: 'date-fns' },
    { name: '@google/generative-ai', module: '@google/generative-ai' },
  ];

  for (const pkg of requiredPackages) {
    try {
      await import(pkg.module);
      log(`✅ ${pkg.name} - INSTALLED`, colors.green);
      results.push({ name: pkg.name, status: 'PASS', message: 'Package installed' });
    } catch (error) {
      log(`❌ ${pkg.name} - MISSING`, colors.red);
      results.push({ name: pkg.name, status: 'FAIL', message: 'Package not installed' });
    }
  }
}

// ============================================================================
// B. ENVIRONMENT KEY VALIDATION
// ============================================================================

async function testEnvironmentKeys() {
  log('\n' + '='.repeat(80), colors.cyan);
  log('B. ENVIRONMENT KEY VALIDATION', colors.bold);
  log('='.repeat(80), colors.cyan);

  // Test 1: Gemini API Keys
  log('\n📡 Testing Gemini API Connection...', colors.yellow);
  const geminiKeys = [
    process.env.GOOGLE_GENERATIVE_AI_API_KEY_1,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY_2,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY_3,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY_4,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY_5,
  ].filter(Boolean);

  if (geminiKeys.length === 0) {
    log('❌ No Gemini API keys found', colors.red);
    results.push({ name: 'Gemini API Keys', status: 'FAIL', message: 'No keys configured' });
  } else {
    log(`✅ Found ${geminiKeys.length} Gemini API keys`, colors.green);
    
    // Test first key with simple ping
    try {
      const genAI = new GoogleGenerativeAI(geminiKeys[0]!);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent('Hello');
      const response = await result.response;
      
      if (response.text()) {
        log('✅ Gemini API handshake successful', colors.green);
        results.push({ name: 'Gemini API', status: 'PASS', message: 'Connection verified' });
      }
    } catch (error: any) {
      log(`❌ Gemini API test failed: ${error.message}`, colors.red);
      results.push({ name: 'Gemini API', status: 'FAIL', message: error.message });
    }
  }

  // Test 2: Google Sheets Webhook
  log('\n📊 Testing Google Sheets Webhook...', colors.yellow);
  const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;
  
  if (!webhookUrl) {
    log('❌ GOOGLE_SCRIPT_WEBHOOK_URL not configured', colors.red);
    results.push({ name: 'Google Sheets Webhook', status: 'FAIL', message: 'URL not configured' });
  } else {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });

      if (response.ok) {
        log('✅ Google Sheets webhook responded', colors.green);
        results.push({ name: 'Google Sheets Webhook', status: 'PASS', message: 'Endpoint accessible' });
      } else {
        log(`⚠️  Google Sheets webhook returned ${response.status}`, colors.yellow);
        results.push({ name: 'Google Sheets Webhook', status: 'WARN', message: `HTTP ${response.status}` });
      }
    } catch (error: any) {
      log(`❌ Google Sheets webhook failed: ${error.message}`, colors.red);
      results.push({ name: 'Google Sheets Webhook', status: 'FAIL', message: error.message });
    }
  }

  // Test 3: Upstash Redis
  log('\n🔴 Testing Upstash Redis Connection...', colors.yellow);
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    log('❌ Upstash Redis credentials not configured', colors.red);
    results.push({ name: 'Upstash Redis', status: 'FAIL', message: 'Credentials missing' });
  } else {
    try {
      const redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });

      const testKey = 'preflight_test';
      await redis.set(testKey, 'test_value', { ex: 10 });
      const value = await redis.get(testKey);
      await redis.del(testKey);

      if (value === 'test_value') {
        log('✅ Upstash Redis read/write successful', colors.green);
        results.push({ name: 'Upstash Redis', status: 'PASS', message: 'Connection verified' });
      }
    } catch (error: any) {
      log(`❌ Upstash Redis test failed: ${error.message}`, colors.red);
      results.push({ name: 'Upstash Redis', status: 'FAIL', message: error.message });
    }
  }

  // Test 4: Upstash QStash
  log('\n🚀 Testing Upstash QStash Connection...', colors.yellow);
  const qstashToken = process.env.QSTASH_TOKEN;

  if (!qstashToken) {
    log('❌ QSTASH_TOKEN not configured', colors.red);
    results.push({ name: 'Upstash QStash', status: 'FAIL', message: 'Token missing' });
  } else {
    try {
      const qstash = new QStashClient({ token: qstashToken });
      
      // Just verify client instantiation (avoid actual message publish in test)
      log('✅ QStash client initialized', colors.green);
      results.push({ name: 'Upstash QStash', status: 'PASS', message: 'Client ready' });
    } catch (error: any) {
      log(`❌ QStash initialization failed: ${error.message}`, colors.red);
      results.push({ name: 'Upstash QStash', status: 'FAIL', message: error.message });
    }
  }
}

// ============================================================================
// C. MISSING PACKAGES REPORT
// ============================================================================

function reportMissingPackages() {
  log('\n' + '='.repeat(80), colors.cyan);
  log('C. MISSING PACKAGES INSTALLATION COMMANDS', colors.bold);
  log('='.repeat(80), colors.cyan);

  const failedPackages = results.filter(r => r.status === 'FAIL' && r.name !== 'Gemini API' && r.name !== 'Google Sheets Webhook' && r.name !== 'Upstash Redis' && r.name !== 'Upstash QStash');

  if (failedPackages.length === 0) {
    log('\n✅ All required packages are installed', colors.green);
  } else {
    log('\n⚠️  Run the following command to install missing packages:', colors.yellow);
    const packageNames = failedPackages.map(p => p.name).join(' ');
    log(`\nbun add ${packageNames}`, colors.cyan);
  }
}

// ============================================================================
// D. SUMMARY REPORT
// ============================================================================

function printSummary() {
  log('\n' + '='.repeat(80), colors.cyan);
  log('VERIFICATION SUMMARY', colors.bold);
  log('='.repeat(80), colors.cyan);

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  log(`\nTotal Tests:  ${results.length}`, colors.cyan);
  log(`✅ Passed:    ${passed}`, colors.green);
  log(`❌ Failed:    ${failed}`, colors.red);
  log(`⚠️  Warnings:  ${warned}`, colors.yellow);

  if (failed > 0) {
    log('\n❌ PREFLIGHT CHECK FAILED - Fix errors before proceeding', colors.red);
    log('\nFailed Tests:', colors.red);
    results.filter(r => r.status === 'FAIL').forEach(r => {
      log(`  • ${r.name}: ${r.message}`, colors.red);
    });
  } else if (warned > 0) {
    log('\n⚠️  PREFLIGHT CHECK PASSED WITH WARNINGS', colors.yellow);
  } else {
    log('\n✅ ALL CHECKS PASSED - Ready for implementation', colors.green);
  }

  log('\n' + '='.repeat(80), colors.cyan);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  log('\n' + '='.repeat(80), colors.bold);
  log('PRE-FLIGHT VERIFICATION: DATA INGESTION ENGINE', colors.bold);
  log('='.repeat(80), colors.bold);

  await testDependencies();
  await testEnvironmentKeys();
  reportMissingPackages();
  printSummary();
}

main().catch(console.error);
