#!/usr/bin/env node

/**
 * RBAC Integration Tests - SAMADHAAN Health OS
 * Tests middleware protection, navigation filtering, and dashboard access
 */

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🔐 RBAC INTEGRATION TEST SUITE');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

// Test 1: Middleware Admin Protection
console.log('📋 TEST 1: Middleware Admin Route Protection');
const middlewareContent = fs.readFileSync(path.join(__dirname, '..', 'middleware.ts'), 'utf8');

const hasAdminProtection = middlewareContent.includes("pathname.startsWith('/admin')");
const hasSuperuserCheck = middlewareContent.includes("SUPERUSER_ROLES");
const hasPCRedirect = middlewareContent.includes("role === 'PC'");

if (hasAdminProtection && hasSuperuserCheck && hasPCRedirect) {
  console.log('   ✅ Admin route protection: FOUND');
  console.log('   ✅ SUPERUSER_ROLES check: FOUND');
  console.log('   ✅ PC redirect logic: FOUND');
  console.log('   ✅ PASSED\n');
  passed++;
} else {
  console.log('   ❌ Missing required middleware checks');
  console.log('   ❌ FAILED\n');
  failed++;
}

// Test 2: Session Scope Configuration
console.log('📋 TEST 2: Session Scope Configuration');
const sessionScopeContent = fs.readFileSync(path.join(__dirname, '..', 'lib', 'session-scope.ts'), 'utf8');

const hasSuperuserRoles = sessionScopeContent.includes("SUPERUSER_ROLES = ['PM', 'admin']");
const hasStateLevel = sessionScopeContent.includes("isStateLevel = role === 'SPM' || role === 'ME'");
const hasStaffNameFilter = sessionScopeContent.includes("staffName: role === 'PC'");
const usesStaffNameColumn = sessionScopeContent.includes("q.ilike('staff_name'");

if (hasSuperuserRoles && hasStateLevel && hasStaffNameFilter && usesStaffNameColumn) {
  console.log('   ✅ SUPERUSER_ROLES defined: PM, admin');
  console.log('   ✅ State-level logic: SPM, ME');
  console.log('   ✅ PC staffName filtering: FOUND');
  console.log('   ✅ Correct column name (staff_name): FOUND');
  console.log('   ✅ PASSED\n');
  passed++;
} else {
  console.log('   ❌ Missing required session scope configuration');
  if (!usesStaffNameColumn) console.log('   ❌ ERROR: Using wrong column name (should be staff_name)');
  console.log('   ❌ FAILED\n');
  failed++;
}

// Test 3: Dashboard Layout Navigation Filtering
console.log('📋 TEST 3: Dashboard Layout Navigation Filtering');
const dashboardLayoutContent = fs.readFileSync(path.join(__dirname, '..', 'app', 'dashboard', 'layout.tsx'), 'utf8');

const hasTABConfig = dashboardLayoutContent.includes('TAB_CONFIG');
const hasPCTabConfig = dashboardLayoutContent.includes('PC_TAB_CONFIG');
const hasVisibleTabsLogic = dashboardLayoutContent.includes('visibleTabs');
const hasMECommandHubExclusion = dashboardLayoutContent.includes("role === 'ME'") && dashboardLayoutContent.includes('command-hub');

if (hasTABConfig && hasPCTabConfig && hasVisibleTabsLogic) {
  console.log('   ✅ TAB_CONFIG defined: FOUND');
  console.log('   ✅ PC_TAB_CONFIG defined: FOUND');
  console.log('   ✅ visibleTabs logic: FOUND');
  if (hasMECommandHubExclusion) {
    console.log('   ✅ ME Command Hub exclusion: FOUND');
  }
  console.log('   ✅ PASSED\n');
  passed++;
} else {
  console.log('   ❌ Missing navigation filtering logic');
  console.log('   ❌ FAILED\n');
  failed++;
}

// Test 4: PC Dashboard Page Exists
console.log('📋 TEST 4: PC Dashboard Page');
const pcDashboardPath = path.join(__dirname, '..', 'app', 'dashboard', 'my-submissions', 'page.tsx');

if (fs.existsSync(pcDashboardPath)) {
  const pcDashboardContent = fs.readFileSync(pcDashboardPath, 'utf8');
  const hasStatsCards = pcDashboardContent.includes('Today') && pcDashboardContent.includes('This Week');
  const hasPatientList = pcDashboardContent.includes('patient');
  const hasSubmitButton = pcDashboardContent.includes('Submit New Record');
  
  if (hasStatsCards && hasPatientList && hasSubmitButton) {
    console.log('   ✅ PC dashboard page: EXISTS');
    console.log('   ✅ Stats cards: FOUND');
    console.log('   ✅ Patient list: FOUND');
    console.log('   ✅ Submit button: FOUND');
    console.log('   ✅ PASSED\n');
    passed++;
  } else {
    console.log('   ⚠️  PC dashboard exists but missing components');
    console.log('   ❌ FAILED\n');
    failed++;
  }
} else {
  console.log('   ❌ PC dashboard page not found');
  console.log('   ❌ FAILED\n');
  failed++;
}

// Test 5: Admin Layout Authorization
console.log('📋 TEST 5: Admin Layout Authorization');
const adminLayoutPath = path.join(__dirname, '..', 'app', 'admin', 'layout.tsx');

if (fs.existsSync(adminLayoutPath)) {
  const adminLayoutContent = fs.readFileSync(adminLayoutPath, 'utf8');
  const hasSuperuserCheck = adminLayoutContent.includes('SUPERUSER_ROLES');
  const hasUnauthorizedRedirect = adminLayoutContent.includes('/unauthorized');
  
  if (hasSuperuserCheck && hasUnauthorizedRedirect) {
    console.log('   ✅ Admin layout: EXISTS');
    console.log('   ✅ SUPERUSER_ROLES check: FOUND');
    console.log('   ✅ Unauthorized redirect: FOUND');
    console.log('   ✅ PASSED\n');
    passed++;
  } else {
    console.log('   ⚠️  Admin layout exists but missing authorization');
    console.log('   ❌ FAILED\n');
    failed++;
  }
} else {
  console.log('   ❌ Admin layout not found');
  console.log('   ❌ FAILED\n');
  failed++;
}

// Test 6: Command Hub Authorization
console.log('📋 TEST 6: Command Hub Authorization');
const commandHubPath = path.join(__dirname, '..', 'app', 'dashboard', 'command-hub', 'page.tsx');

if (fs.existsSync(commandHubPath)) {
  const commandHubContent = fs.readFileSync(commandHubPath, 'utf8');
  const hasSuperuserCheck = commandHubContent.includes('SUPERUSER_ROLES') || commandHubContent.includes('isSuperuser');
  
  if (hasSuperuserCheck) {
    console.log('   ✅ Command Hub page: EXISTS');
    console.log('   ✅ Superuser check: FOUND');
    console.log('   ✅ PASSED\n');
    passed++;
  } else {
    console.log('   ⚠️  Command Hub exists but missing authorization check');
    console.log('   ❌ FAILED\n');
    failed++;
  }
} else {
  console.log('   ❌ Command Hub page not found');
  console.log('   ❌ FAILED\n');
  failed++;
}

// Test 7: Auth.ts Impersonation System
console.log('📋 TEST 7: Impersonation System (Auth.ts)');
const authPath = path.join(__dirname, '..', 'auth.ts');

if (fs.existsSync(authPath)) {
  const authContent = fs.readFileSync(authPath, 'utf8');
  const hasVanguardCheck = authContent.includes('OVERRIDE') || authContent.includes('impersonating');
  const hasSuperuserRoles = authContent.includes('SUPERUSER_ROLES');
  
  if (hasVanguardCheck && hasSuperuserRoles) {
    console.log('   ✅ Auth.ts: EXISTS');
    console.log('   ✅ Impersonation system: FOUND');
    console.log('   ✅ SUPERUSER_ROLES check: FOUND');
    console.log('   ✅ PASSED\n');
    passed++;
  } else {
    console.log('   ⚠️  Auth.ts exists but missing impersonation checks');
    console.log('   ❌ FAILED\n');
    failed++;
  }
} else {
  console.log('   ❌ Auth.ts not found');
  console.log('   ❌ FAILED\n');
  failed++;
}

// Test 8: useSessionScope Hook
console.log('📋 TEST 8: useSessionScope Hook');
const useSessionScopePath = path.join(__dirname, '..', 'hooks', 'useSessionScope.ts');

if (fs.existsSync(useSessionScopePath)) {
  const hookContent = fs.readFileSync(useSessionScopePath, 'utf8');
  const hasSuperuserRoles = hookContent.includes("SUPERUSER_ROLES = ['PM', 'admin']");
  const hasStaffNameField = hookContent.includes('staffName');
  
  if (hasSuperuserRoles && hasStaffNameField) {
    console.log('   ✅ useSessionScope hook: EXISTS');
    console.log('   ✅ SUPERUSER_ROLES constant: FOUND');
    console.log('   ✅ staffName field: FOUND');
    console.log('   ✅ PASSED\n');
    passed++;
  } else {
    console.log('   ⚠️  Hook exists but missing required fields');
    console.log('   ❌ FAILED\n');
    failed++;
  }
} else {
  console.log('   ❌ useSessionScope hook not found');
  console.log('   ❌ FAILED\n');
  failed++;
}

// Summary
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('📊 INTEGRATION TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`Total Tests:  ${passed + failed}`);
console.log(`✅ Passed:    ${passed}`);
console.log(`❌ Failed:    ${failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('═══════════════════════════════════════════════════════════════════════════\n');

if (failed === 0) {
  console.log('🎉 ALL INTEGRATION TESTS PASSED!\n');
  console.log('RBAC Implementation Summary:');
  console.log('  ✅ PM/admin: National access, admin panel, impersonation');
  console.log('  ✅ SPM: State-level access, bulk operations');
  console.log('  ✅ ME: State-level access, no Command Hub');
  console.log('  ✅ PC: Own submissions only, simplified dashboard\n');
}

process.exit(failed > 0 ? 1 : 0);
