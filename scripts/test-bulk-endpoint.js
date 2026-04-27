/**
 * Test script for /api/patients/bulk endpoint
 * Tests caching behavior and performance
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://samadhaan.allianceindia.org';

async function testBulkEndpoint() {
  console.log('=== Testing /api/patients/bulk endpoint ===\n');
  
  // Test 1: First call (cache miss)
  console.log('Test 1: First call (should be cache miss)');
  const start1 = Date.now();
  try {
    const response1 = await fetch(`${BASE_URL}/api/patients/bulk`);
    const duration1 = Date.now() - start1;
    
    console.log(`Status: ${response1.status}`);
    console.log(`Duration: ${duration1}ms`);
    console.log(`X-Cache: ${response1.headers.get('X-Cache')}`);
    console.log(`X-Total: ${response1.headers.get('X-Total')}`);
    console.log(`X-Duration-Ms: ${response1.headers.get('X-Duration-Ms')}`);
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log(`Records returned: ${data1.data?.length || 0}`);
      console.log(`Meta:`, data1.meta);
    } else {
      const error = await response1.text();
      console.error(`Error: ${error}`);
    }
  } catch (error) {
    console.error('Test 1 failed:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 2: Second call (cache hit)
  console.log('Test 2: Second call (should be cache hit if within 30s)');
  const start2 = Date.now();
  try {
    const response2 = await fetch(`${BASE_URL}/api/patients/bulk`);
    const duration2 = Date.now() - start2;
    
    console.log(`Status: ${response2.status}`);
    console.log(`Duration: ${duration2}ms`);
    console.log(`X-Cache: ${response2.headers.get('X-Cache')}`);
    console.log(`X-Total: ${response2.headers.get('X-Total')}`);
    console.log(`X-Duration-Ms: ${response2.headers.get('X-Duration-Ms')}`);
    
    if (response2.ok) {
      const data2 = await response2.json();
      console.log(`Records returned: ${data2.data?.length || 0}`);
      console.log(`Meta:`, data2.meta);
    } else {
      const error = await response2.text();
      console.error(`Error: ${error}`);
    }
  } catch (error) {
    console.error('Test 2 failed:', error.message);
  }
  
  console.log('\n=== Test complete ===');
}

// Run test
testBulkEndpoint().catch(console.error);
