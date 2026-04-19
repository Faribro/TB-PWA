/**
 * Test cursor pagination performance
 */

const WEBHOOK_URL = 'http://localhost:3000/api/patients';

async function testCursorPagination() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 CURSOR PAGINATION PERFORMANCE TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Test 1: First page (no cursor)
  console.log('📄 Test 1: First page (limit=500)');
  const start1 = Date.now();
  const response1 = await fetch(`${WEBHOOK_URL}?limit=500`);
  const data1 = await response1.json();
  const duration1 = Date.now() - start1;
  
  console.log(`   ✅ Status: ${response1.status}`);
  console.log(`   ✅ Returned: ${data1.data?.length} records`);
  console.log(`   ✅ Has more: ${data1.hasMore}`);
  console.log(`   ✅ Duration: ${duration1}ms (API: ${data1.meta?.durationMs}ms)`);
  console.log(`   ✅ Next cursor: ${data1.nextCursor ? 'present' : 'none'}\n`);

  if (!data1.nextCursor) {
    console.log('⚠️  No more pages available\n');
    return;
  }

  // Test 2: Second page (with cursor)
  console.log('📄 Test 2: Second page (with cursor)');
  const start2 = Date.now();
  const response2 = await fetch(`${WEBHOOK_URL}?limit=500&cursor=${data1.nextCursor}`);
  const data2 = await response2.json();
  const duration2 = Date.now() - start2;
  
  console.log(`   ✅ Status: ${response2.status}`);
  console.log(`   ✅ Returned: ${data2.data?.length} records`);
  console.log(`   ✅ Has more: ${data2.hasMore}`);
  console.log(`   ✅ Duration: ${duration2}ms (API: ${data2.meta?.durationMs}ms)\n`);

  // Test 3: With filters
  console.log('📄 Test 3: Filtered query (state=Madhya Pradesh)');
  const start3 = Date.now();
  const response3 = await fetch(`${WEBHOOK_URL}?limit=500&state=Madhya Pradesh`);
  const data3 = await response3.json();
  const duration3 = Date.now() - start3;
  
  console.log(`   ✅ Status: ${response3.status}`);
  console.log(`   ✅ Returned: ${data3.data?.length} records`);
  console.log(`   ✅ Duration: ${duration3}ms (API: ${data3.meta?.durationMs}ms)\n`);

  // Test 4: Search query
  console.log('📄 Test 4: Search query (search=test)');
  const start4 = Date.now();
  const response4 = await fetch(`${WEBHOOK_URL}?limit=500&search=test`);
  const data4 = await response4.json();
  const duration4 = Date.now() - start4;
  
  console.log(`   ✅ Status: ${response4.status}`);
  console.log(`   ✅ Returned: ${data4.data?.length} records`);
  console.log(`   ✅ Duration: ${duration4}ms (API: ${data4.meta?.durationMs}ms)\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 PERFORMANCE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`First page:      ${duration1}ms`);
  console.log(`Second page:     ${duration2}ms`);
  console.log(`Filtered:        ${duration3}ms`);
  console.log(`Search:          ${duration4}ms`);
  console.log(`Average:         ${Math.round((duration1 + duration2 + duration3 + duration4) / 4)}ms`);
  console.log('');
  
  if (duration1 < 2000 && duration2 < 2000) {
    console.log('✅ PASS: All queries under 2 seconds');
  } else {
    console.log('⚠️  WARNING: Some queries exceeded 2 seconds');
  }
}

testCursorPagination().catch(console.error);
