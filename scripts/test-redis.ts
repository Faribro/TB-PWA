/**
 * Test Redis Connection
 * Run: bun run scripts/test-redis.ts
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: 'https://infinite-snail-94217.upstash.io',
  token: 'gQAAAAAAAXAJAAIgcDI1MTRmYTAyZjdmNjI0YzJhOTk0OTE5YjAzMGEwMWIyYw',
});

async function testRedis() {
  console.log('🔄 Testing Redis connection...\n');

  try {
    // Test 1: Set a value
    console.log('1️⃣ Setting test key...');
    await redis.set('test:samadhaan', 'Hello from SAMADHAAN OS', { ex: 60 });
    console.log('✅ Set successful\n');

    // Test 2: Get the value
    console.log('2️⃣ Getting test key...');
    const value = await redis.get('test:samadhaan');
    console.log('✅ Get successful:', value, '\n');

    // Test 3: Set with TTL
    console.log('3️⃣ Setting key with 10s TTL...');
    await redis.setex('test:ttl', 10, 'This expires in 10 seconds');
    console.log('✅ TTL set successful\n');

    // Test 4: Check TTL
    console.log('4️⃣ Checking TTL...');
    const ttl = await redis.ttl('test:ttl');
    console.log('✅ TTL remaining:', ttl, 'seconds\n');

    // Test 5: Delete key
    console.log('5️⃣ Deleting test keys...');
    await redis.del('test:samadhaan', 'test:ttl');
    console.log('✅ Delete successful\n');

    console.log('🎉 All Redis tests passed!');
    console.log('✅ Redis is ready for production use');
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    process.exit(1);
  }
}

testRedis();
