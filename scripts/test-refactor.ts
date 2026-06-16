/**
 * Master Test Runner for SAMADHAAN OS Refactor
 * 
 * Runs all tests in sequence to verify the refactor works correctly.
 */

import { execSync } from 'child_process';

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🚀 SAMADHAAN OS REFACTOR - MASTER TEST SUITE');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

const tests = [
  {
    name: 'Fire-and-Forget Sheets Sync',
    command: 'bun run scripts/test-sheets-sync.ts',
    description: 'Tests syncToSheetsAsync() function'
  },
  {
    name: 'Kobo Webhook Refactor',
    command: 'bun run scripts/test-webhook-refactor.ts',
    description: 'Tests webhook with fire-and-forget sync'
  },
  {
    name: 'Patient Sync API Refactor',
    command: 'bun run scripts/test-patient-sync-refactor.ts',
    description: 'Tests patient update with fire-and-forget sync'
  }
];

let passed = 0;
let failed = 0;

async function runTests() {
  console.log('📋 Test Plan:');
  tests.forEach((test, i) => {
    console.log(`${i + 1}. ${test.name}`);
    console.log(`   ${test.description}`);
  });
  console.log();

  console.log('⚠️  PREREQUISITES:');
  console.log('1. Dev server must be running: bun run dev');
  console.log('2. Environment variables must be set in .env.local');
  console.log('3. Supabase must be accessible');
  console.log();

  console.log('Press Ctrl+C to cancel, or wait 5 seconds to start...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n${'═'.repeat(79)}`);
    console.log(`TEST ${i + 1}/${tests.length}: ${test.name}`);
    console.log('═'.repeat(79));
    console.log();

    try {
      execSync(test.command, { 
        stdio: 'inherit',
        env: process.env
      });
      passed++;
      console.log(`\n✅ ${test.name} PASSED\n`);
    } catch (error) {
      failed++;
      console.error(`\n❌ ${test.name} FAILED\n`);
    }

    // Wait between tests
    if (i < tests.length - 1) {
      console.log('⏳ Waiting 3 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 FINAL TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Total Tests:  ${tests.length}`);
  console.log(`✅ Passed:    ${passed}`);
  console.log(`❌ Failed:    ${failed}`);
  console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log();

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log();
    console.log('✅ Fire-and-forget sync is working');
    console.log('✅ Webhook processes requests quickly');
    console.log('✅ Patient updates are non-blocking');
    console.log('✅ No sync tracking in responses');
    console.log();
    console.log('🚀 Refactor is production-ready!');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('Review the output above for details.');
  }

  console.log();
  console.log('📝 NEXT STEPS:');
  console.log('1. Run migration: supabase db push');
  console.log('2. Test Realtime: bun run scripts/test-realtime.ts');
  console.log('3. Deploy to production');
  console.log();
}

runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
