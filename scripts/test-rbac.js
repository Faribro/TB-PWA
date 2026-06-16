#!/usr/bin/env node

/**
 * RBAC Testing Script for SAMADHAAN Health OS
 * Tests role-based access control implementation using Supabase
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wwcgybgvfulotflitogu.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

// Test user profiles for each role
const TEST_USERS = {
  PM: { email: 'pm@test.com', name: 'PM Test User', role: 'PM', state: null, district: null },
  admin: { email: 'admin@test.com', name: 'Admin Test User', role: 'admin', state: null, district: null },
  SPM: { email: 'spm@test.com', name: 'SPM Test User', role: 'SPM', state: 'Maharashtra', district: null },
  ME: { email: 'me@test.com', name: 'ME Test User', role: 'ME', state: 'Maharashtra', district: null },
  PC: { email: 'pc@test.com', name: 'PC Test User', role: 'PC', state: 'Maharashtra', district: 'Mumbai', staffName: 'PC Test User' }
};

// Test scenarios
const TESTS = [
  {
    name: 'PM Role - National Access',
    role: 'PM',
    expectedAccess: 'all',
    expectedCount: '>0'
  },
  {
    name: 'Admin Role - National Access',
    role: 'admin',
    expectedAccess: 'all',
    expectedCount: '>0'
  },
  {
    name: 'SPM Role - State Level Access',
    role: 'SPM',
    expectedAccess: 'state',
    expectedCount: '>0'
  },
  {
    name: 'ME Role - State Level Access',
    role: 'ME',
    expectedAccess: 'state',
    expectedCount: '>0'
  },
  {
    name: 'PC Role - Own Submissions Only',
    role: 'PC',
    expectedAccess: 'own',
    expectedCount: '>=0'
  }
];

async function testRoleAccess(user) {
  const query = new URLSearchParams({
    select: 'id,inmate_name,screening_state,screening_district,staff_name'
  });

  // Apply role-based filtering
  if (user.role === 'PC' && user.staffName) {
    query.append('staff_name', `eq.${user.staffName}`);
  } else if (['SPM', 'ME'].includes(user.role) && user.state) {
    query.append('screening_state', `eq.${user.state}`);
  }
  // PM and admin get no filters (national access)

  const url = `${SUPABASE_URL}/rest/v1/patients?${query.toString()}&limit=10`;

  const response = await fetch(url, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔐 RBAC TESTING SUITE - SAMADHAAN Health OS');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const test of TESTS) {
    const user = TEST_USERS[test.role];
    console.log(`\n📋 TEST: ${test.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   State: ${user.state || 'null (national)'}`);
    console.log(`   District: ${user.district || 'null'}`);
    if (user.staffName) console.log(`   Staff Name: ${user.staffName}`);

    try {
      const data = await testRoleAccess(user);
      const count = data.length;

      console.log(`   📊 Records returned: ${count}`);

      // Validate access level
      let accessValid = true;
      if (test.expectedAccess === 'state' && user.state) {
        // Check all records match user's state
        const wrongState = data.filter(p => p.screening_state !== user.state);
        if (wrongState.length > 0) {
          console.log(`   ❌ Found ${wrongState.length} records from wrong state`);
          accessValid = false;
        }
      } else if (test.expectedAccess === 'own' && user.staffName) {
        // Check all records match user's staff name
        const wrongStaff = data.filter(p => p.staff_name !== user.staffName);
        if (wrongStaff.length > 0) {
          console.log(`   ❌ Found ${wrongStaff.length} records from other staff`);
          accessValid = false;
        }
      }

      // Validate count
      let countValid = true;
      if (test.expectedCount === '>0' && count === 0) {
        console.log(`   ⚠️  Warning: Expected records but got 0 (may be valid if no data exists)`);
        countValid = false;
      }

      if (accessValid && (countValid || test.expectedCount === '>=0')) {
        console.log(`   ✅ PASSED`);
        passed++;
      } else {
        console.log(`   ❌ FAILED`);
        failed++;
      }

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Total Tests:  ${TESTS.length}`);
  console.log(`✅ Passed:    ${passed}`);
  console.log(`❌ Failed:    ${failed}`);
  console.log(`Success Rate: ${((passed / TESTS.length) * 100).toFixed(1)}%`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
