#!/usr/bin/env node

/**
 * Redis Connection Test Script
 * Tests Redis/Upstash connection and queue initialization
 */

const IORedis = require('ioredis');

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🔴 REDIS CONNECTION TEST');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_URL = process.env.REDIS_URL;

console.log('📋 Environment Variables Check:');
console.log(`   REDIS_URL: ${REDIS_URL ? '✅ Set' : '❌ Not set'}`);
console.log(`   UPSTASH_REDIS_REST_URL: ${UPSTASH_REDIS_REST_URL ? '✅ Set' : '❌ Not set'}`);
console.log(`   UPSTASH_REDIS_REST_TOKEN: ${UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '❌ Not set'}\n`);

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  console.error('❌ Missing Upstash credentials!');
  console.error('   Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local\n');
  process.exit(1);
}

// Construct Redis URL
let redisUrl = REDIS_URL;

if (!redisUrl) {
  const hostname = UPSTASH_REDIS_REST_URL.replace('https://', '').replace('http://', '');
  const token = UPSTASH_REDIS_REST_TOKEN;
  redisUrl = `rediss://default:${token}@${hostname}:6379`;
  console.log('🔧 Constructed Redis URL from Upstash credentials:');
  console.log(`   rediss://default:***@${hostname}:6379\n`);
} else {
  console.log('🔧 Using REDIS_URL from environment\n');
}

console.log('🔌 Attempting to connect to Redis...\n');

const client = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    if (times > 3) {
      console.log(`   ⚠️  Max retries (3) reached, giving up\n`);
      return null;
    }
    const delay = Math.min(times * 50, 2000);
    console.log(`   🔄 Retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  lazyConnect: false, // Connect immediately for testing
  tls: {
    rejectUnauthorized: false // Accept self-signed certs
  },
  connectTimeout: 10000,
  commandTimeout: 5000,
});

let testsPassed = 0;
let testsFailed = 0;

client.on('connect', () => {
  console.log('✅ TEST 1: Connection established\n');
  testsPassed++;
});

client.on('ready', async () => {
  console.log('✅ TEST 2: Client ready\n');
  testsPassed++;

  try {
    // Test 3: PING command
    console.log('🧪 TEST 3: Testing PING command...');
    const pong = await client.ping();
    if (pong === 'PONG') {
      console.log('✅ TEST 3: PING successful (received PONG)\n');
      testsPassed++;
    } else {
      console.log(`❌ TEST 3: PING failed (received: ${pong})\n`);
      testsFailed++;
    }

    // Test 4: SET command
    console.log('🧪 TEST 4: Testing SET command...');
    const testKey = 'test:samadhaan:' + Date.now();
    const testValue = 'Hello from SAMADHAAN!';
    await client.set(testKey, testValue, 'EX', 60);
    console.log(`✅ TEST 4: SET successful (key: ${testKey})\n`);
    testsPassed++;

    // Test 5: GET command
    console.log('🧪 TEST 5: Testing GET command...');
    const retrieved = await client.get(testKey);
    if (retrieved === testValue) {
      console.log(`✅ TEST 5: GET successful (value: ${retrieved})\n`);
      testsPassed++;
    } else {
      console.log(`❌ TEST 5: GET failed (expected: ${testValue}, got: ${retrieved})\n`);
      testsFailed++;
    }

    // Test 6: DEL command
    console.log('🧪 TEST 6: Testing DEL command...');
    await client.del(testKey);
    console.log(`✅ TEST 6: DEL successful (cleaned up test key)\n`);
    testsPassed++;

    // Print summary
    printSummary();
    
    await client.quit();
    process.exit(testsFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error(`❌ TEST FAILED: ${error.message}\n`);
    testsFailed++;
    printSummary();
    await client.quit();
    process.exit(1);
  }
});

client.on('error', (err) => {
  console.error(`❌ Redis Error: ${err.message}\n`);
  testsFailed++;
});

client.on('close', () => {
  console.log('🔌 Connection closed\n');
});

// Timeout after 15 seconds
setTimeout(() => {
  console.error('❌ TEST TIMEOUT: Connection took too long (15s)\n');
  testsFailed++;
  printSummary();
  client.disconnect();
  process.exit(1);
}, 15000);

function printSummary() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Total Tests:  ${testsPassed + testsFailed}`);
  console.log(`✅ Passed:    ${testsPassed}`);
  console.log(`❌ Failed:    ${testsFailed}`);
  console.log(`Success Rate: ${testsPassed + testsFailed > 0 ? ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1) : 0}%`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  if (testsFailed === 0) {
    console.log('🎉 ALL TESTS PASSED - Redis connection is working!\n');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Check the errors above\n');
  }
}
