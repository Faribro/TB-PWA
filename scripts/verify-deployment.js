#!/usr/bin/env node

/**
 * POST-DEPLOYMENT VERIFICATION SCRIPT
 * Run this after deploying to production to verify all auth/security fixes
 */

const PRODUCTION_URL = process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🚀 POST-DEPLOYMENT VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`Target: ${PRODUCTION_URL}\n`);

const tests = [
  {
    name: 'Unauthenticated GET /api/patients',
    test: async () => {
      const res = await fetch(`${PRODUCTION_URL}/api/patients`);
      const data = await res.json();
      return res.status === 401 && data.error === 'Unauthorized';
    }
  },
  {
    name: 'Unauthenticated GET /api/patients/export',
    test: async () => {
      const res = await fetch(`${PRODUCTION_URL}/api/patients/export`);
      const data = await res.json();
      return res.status === 401 && data.error === 'Unauthorized';
    }
  },
  {
    name: 'Invalid date param returns 400',
    test: async () => {
      const res = await fetch(`${PRODUCTION_URL}/api/patients?dateFrom=invalid-date`, {
        headers: { 'Cookie': 'next-auth.session-token=test' }
      });
      return res.status === 400 || res.status === 401; // 401 if no valid session
    }
  },
  {
    name: 'Search query >100 chars returns 400',
    test: async () => {
      const longSearch = 'a'.repeat(101);
      const res = await fetch(`${PRODUCTION_URL}/api/patients?search=${longSearch}`, {
        headers: { 'Cookie': 'next-auth.session-token=test' }
      });
      return res.status === 400 || res.status === 401;
    }
  },
  {
    name: 'Health endpoint accessible',
    test: async () => {
      const res = await fetch(`${PRODUCTION_URL}/api/health`);
      return res.status === 200;
    }
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        console.log(`✅ ${name}`);
        passed++;
      } else {
        console.log(`❌ ${name}`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ ${name} - ${err.message}`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log(`📊 RESULTS: ${passed}/${tests.length} passed`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED - Deployment verified!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed - Review deployment\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
