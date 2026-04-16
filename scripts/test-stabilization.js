#!/usr/bin/env node

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🧪 TB-PWA STABILIZATION TEST SUITE');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`Target: ${BASE_URL}`);
console.log('');

const tests = [];

async function test(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`✅ ${name} (${duration}ms)`);
    tests.push({ name, passed: true, duration });
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ ${name} (${duration}ms)`);
    console.log(`   Error: ${error.message}`);
    tests.push({ name, passed: false, duration, error: error.message });
  }
}

async function testPatientsAPI() {
  const response = await fetch(`${BASE_URL}/api/patients?page=1&pageSize=100`);
  if (!response.ok) throw new Error(`Status ${response.status}`);
  
  const data = await response.json();
  if (!data.data) throw new Error('Missing data field');
  if (!data.meta) throw new Error('Missing meta field');
  if (data.data.length > 100) throw new Error(`Returned ${data.data.length} > 100 limit`);
  if (data.meta.durationMs > 2000) throw new Error(`Duration ${data.meta.durationMs}ms > 2s`);
}

async function testVertexMetrics() {
  const response = await fetch(`${BASE_URL}/api/vertex/metrics?view=month`);
  if (!response.ok) throw new Error(`Status ${response.status}`);
  
  const data = await response.json();
  if (data.error && !data.fallback) throw new Error(data.error);
  if (typeof data.screened !== 'number') throw new Error('Missing screened count');
}

async function testPatientsPageSize() {
  const response = await fetch(`${BASE_URL}/api/patients?page=1&pageSize=500`);
  if (!response.ok) throw new Error(`Status ${response.status}`);
  
  const data = await response.json();
  if (data.data.length > 100) throw new Error(`Returned ${data.data.length}, should cap at 100`);
}

async function testCacheHeaders() {
  const response = await fetch(`${BASE_URL}/api/patients?page=1&pageSize=100`);
  const cacheControl = response.headers.get('cache-control');
  if (!cacheControl) throw new Error('Missing Cache-Control header');
  if (!cacheControl.includes('stale-while-revalidate')) throw new Error('Missing SWR directive');
}

async function testTimeout() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  
  try {
    const response = await fetch(`${BASE_URL}/api/patients?page=1&pageSize=100`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (!response.ok) throw new Error(`Status ${response.status}`);
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') throw new Error('Request timeout > 3s');
    throw error;
  }
}

async function runTests() {
  console.log('🔍 Running tests...');
  console.log('');
  
  await test('Patients API returns data', testPatientsAPI);
  await test('Vertex metrics returns data', testVertexMetrics);
  await test('Page size capped at 100', testPatientsPageSize);
  await test('Cache headers present', testCacheHeaders);
  await test('Response time < 3s', testTimeout);
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  
  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  const avgDuration = tests.reduce((sum, t) => sum + t.duration, 0) / tests.length;
  
  console.log(`Total: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Avg Duration: ${avgDuration.toFixed(0)}ms`);
  console.log('');
  
  if (failed > 0) {
    console.log('❌ TESTS FAILED');
    process.exit(1);
  } else {
    console.log('✅ ALL TESTS PASSED');
  }
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
