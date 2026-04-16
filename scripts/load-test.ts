import { setTimeout } from 'timers/promises';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '100', 10);
const TEST_DURATION_MS = parseInt(process.env.TEST_DURATION_MS || '60000', 10);

interface TestResult {
  endpoint: string;
  status: number;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function testEndpoint(endpoint: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Cookie': process.env.TEST_COOKIE || ''
      }
    });
    
    const duration = Date.now() - start;
    return {
      endpoint,
      status: response.status,
      duration
    };
  } catch (error) {
    return {
      endpoint,
      status: 0,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function simulateUser(userId: number) {
  const endpoints = [
    '/api/patients?page=1&pageSize=100',
    '/api/vertex/metrics?view=month',
    '/api/me'
  ];
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < TEST_DURATION_MS) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    await setTimeout(Math.random() * 2000 + 1000);
  }
}

async function runLoadTest() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔥 TB-PWA LOAD TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`Duration: ${TEST_DURATION_MS / 1000}s`);
  console.log('');
  
  const startTime = Date.now();
  
  const users = Array.from({ length: CONCURRENT_USERS }, (_, i) => simulateUser(i));
  await Promise.all(users);
  
  const totalDuration = Date.now() - startTime;
  
  console.log('');
  console.log('📊 RESULTS');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  
  const successCount = results.filter(r => r.status === 200).length;
  const errorCount = results.filter(r => r.status !== 200).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const p95Duration = results.sort((a, b) => a.duration - b.duration)[Math.floor(results.length * 0.95)]?.duration || 0;
  
  console.log(`Total Requests: ${results.length}`);
  console.log(`✅ Success: ${successCount} (${(successCount / results.length * 100).toFixed(1)}%)`);
  console.log(`❌ Errors: ${errorCount} (${(errorCount / results.length * 100).toFixed(1)}%)`);
  console.log(`⏱️  Avg Duration: ${avgDuration.toFixed(0)}ms`);
  console.log(`⏱️  P95 Duration: ${p95Duration.toFixed(0)}ms`);
  console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log('');
  
  const byEndpoint = results.reduce((acc, r) => {
    if (!acc[r.endpoint]) acc[r.endpoint] = [];
    acc[r.endpoint].push(r);
    return acc;
  }, {} as Record<string, TestResult[]>);
  
  console.log('📈 BY ENDPOINT');
  Object.entries(byEndpoint).forEach(([endpoint, endpointResults]) => {
    const success = endpointResults.filter(r => r.status === 200).length;
    const avg = endpointResults.reduce((sum, r) => sum + r.duration, 0) / endpointResults.length;
    console.log(`  ${endpoint}`);
    console.log(`    Success: ${success}/${endpointResults.length} (${(success / endpointResults.length * 100).toFixed(1)}%)`);
    console.log(`    Avg: ${avg.toFixed(0)}ms`);
  });
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  
  if (errorCount / results.length > 0.05) {
    console.log('❌ FAILED: Error rate > 5%');
    process.exit(1);
  } else {
    console.log('✅ PASSED: Error rate < 5%');
  }
}

runLoadTest().catch(console.error);
