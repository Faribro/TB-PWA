/**
 * Test script for UUID-based patient fetching
 * Run: bun run test:uuid
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testUuidFetch() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 PATIENT UUID FETCH TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Get a sample patient UUID from the database
    console.log('📊 Step 1: Fetching sample patient to get UUID...');
    const listResponse = await fetch(`${BACKEND_URL}/api/patients?limit=1`);
    
    if (!listResponse.ok) {
      throw new Error(`Failed to fetch patients: ${listResponse.status}`);
    }

    const listData = await listResponse.json();
    
    if (!listData.data || listData.data.length === 0) {
      console.log('⚠️  No patients found in database. Please add test data first.');
      return;
    }

    const samplePatient = listData.data[0];
    const testUuid = samplePatient.kobo_uuid;

    if (!testUuid) {
      console.log('⚠️  Sample patient has no kobo_uuid. Trying another...');
      console.log('Sample patient:', JSON.stringify(samplePatient, null, 2));
      return;
    }

    console.log(`✅ Found test UUID: ${testUuid}`);
    console.log(`   Patient: ${samplePatient.inmate_name || 'Unknown'}\n`);

    // Step 2: Test UUID fetch endpoint
    console.log('🔍 Step 2: Testing UUID fetch endpoint...');
    const startTime = Date.now();
    
    const uuidResponse = await fetch(`${BACKEND_URL}/api/patients/uuid?uuid=${testUuid}`);
    const duration = Date.now() - startTime;

    console.log(`   Status: ${uuidResponse.status} ${uuidResponse.statusText}`);
    console.log(`   Duration: ${duration}ms`);

    if (!uuidResponse.ok) {
      const errorData = await uuidResponse.json();
      console.log('❌ FAILED:', errorData);
      return;
    }

    const uuidData = await uuidResponse.json();
    console.log('✅ SUCCESS\n');

    // Step 3: Verify data integrity
    console.log('🔬 Step 3: Verifying data integrity...');
    const fetchedPatient = uuidData.data;

    const checks = [
      { name: 'UUID matches', pass: fetchedPatient.kobo_uuid === testUuid },
      { name: 'ID matches', pass: fetchedPatient.id === samplePatient.id },
      { name: 'Name matches', pass: fetchedPatient.inmate_name === samplePatient.inmate_name },
      { name: 'Has metadata', pass: !!uuidData.meta },
      { name: 'Fetch method correct', pass: uuidData.meta.fetchedBy === 'uuid' }
    ];

    checks.forEach(check => {
      console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    const allPassed = checks.every(c => c.pass);

    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`Total Checks: ${checks.length}`);
    console.log(`✅ Passed: ${checks.filter(c => c.pass).length}`);
    console.log(`❌ Failed: ${checks.filter(c => !c.pass).length}`);
    console.log(`Success Rate: ${((checks.filter(c => c.pass).length / checks.length) * 100).toFixed(1)}%`);
    console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);

    // Step 4: Test error cases
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('🧪 Step 4: Testing error cases...');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    // Test 4a: Missing UUID
    console.log('Test 4a: Missing UUID parameter');
    const noUuidResponse = await fetch(`${BACKEND_URL}/api/patients/uuid`);
    console.log(`   Status: ${noUuidResponse.status} (expected 400)`);
    console.log(`   ${noUuidResponse.status === 400 ? '✅' : '❌'} Correct error handling\n`);

    // Test 4b: Invalid UUID
    console.log('Test 4b: Invalid UUID');
    const invalidUuidResponse = await fetch(`${BACKEND_URL}/api/patients/uuid?uuid=invalid-uuid-12345`);
    console.log(`   Status: ${invalidUuidResponse.status} (expected 404)`);
    console.log(`   ${invalidUuidResponse.status === 404 ? '✅' : '❌'} Correct error handling\n`);

    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ UUID FETCH TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ TEST FAILED WITH EXCEPTION:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testUuidFetch();
