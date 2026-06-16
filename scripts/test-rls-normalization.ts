/**
 * RLS JWT Normalization Test
 * Verifies that role normalization in auth.ts matches RLS policy expectations
 * 
 * Run: bun run test:rls
 */

import { normalizeRole, Role } from '../lib/constants/roles';

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🔐 RLS JWT NORMALIZATION TEST');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

// Test cases: [input from profiles.role, expected output for RLS]
const testCases: Array<[string, string]> = [
  ['PM', Role.PROGRAM_MANAGER],
  ['SPM', Role.STATE_PROGRAM_MANAGER],
  ['ME', Role.ME_OFFICER],
  ['PC', Role.PRISON_COORDINATOR],
  ['admin', Role.ADMIN],
  // Long form should pass through unchanged
  ['Program Manager', Role.PROGRAM_MANAGER],
  ['State Program Manager', Role.STATE_PROGRAM_MANAGER],
  ['M&E Officer', Role.ME_OFFICER],
  ['Prison Coordinator', Role.PRISON_COORDINATOR],
];

// RLS policy expectations (from supabase/rls-policies.sql)
const rlsPolicyExpectations = {
  patients_select_national: ['admin', 'Program Manager'],
  patients_select_state: ['State Program Manager', 'M&E Officer'],
  patients_select_facility: ['Prison Coordinator'],
};

let passed = 0;
let failed = 0;

console.log('📋 TEST 1: Role Normalization\n');

testCases.forEach(([input, expected]) => {
  const result = normalizeRole(input);
  const status = result === expected ? '✅' : '❌';
  
  if (result === expected) {
    passed++;
    console.log(`${status} "${input}" → "${result}"`);
  } else {
    failed++;
    console.log(`${status} "${input}" → "${result}" (expected: "${expected}")`);
  }
});

console.log('\n───────────────────────────────────────────────────────────────────────────\n');
console.log('📋 TEST 2: RLS Policy Compatibility\n');

// Verify normalized roles match RLS expectations
const normalizedRoles = {
  PM: normalizeRole('PM'),
  SPM: normalizeRole('SPM'),
  ME: normalizeRole('ME'),
  PC: normalizeRole('PC'),
  admin: normalizeRole('admin'),
};

// Check national tier
const pmMatchesNational = rlsPolicyExpectations.patients_select_national.includes(normalizedRoles.PM!);
const adminMatchesNational = rlsPolicyExpectations.patients_select_national.includes(normalizedRoles.admin!);

console.log(`${pmMatchesNational ? '✅' : '❌'} PM → "${normalizedRoles.PM}" matches patients_select_national`);
console.log(`${adminMatchesNational ? '✅' : '❌'} admin → "${normalizedRoles.admin}" matches patients_select_national`);

if (pmMatchesNational) passed++; else failed++;
if (adminMatchesNational) passed++; else failed++;

// Check state tier
const spmMatchesState = rlsPolicyExpectations.patients_select_state.includes(normalizedRoles.SPM!);
const meMatchesState = rlsPolicyExpectations.patients_select_state.includes(normalizedRoles.ME!);

console.log(`${spmMatchesState ? '✅' : '❌'} SPM → "${normalizedRoles.SPM}" matches patients_select_state`);
console.log(`${meMatchesState ? '✅' : '❌'} ME → "${normalizedRoles.ME}" matches patients_select_state`);

if (spmMatchesState) passed++; else failed++;
if (meMatchesState) passed++; else failed++;

// Check facility tier
const pcMatchesFacility = rlsPolicyExpectations.patients_select_facility.includes(normalizedRoles.PC!);

console.log(`${pcMatchesFacility ? '✅' : '❌'} PC → "${normalizedRoles.PC}" matches patients_select_facility`);

if (pcMatchesFacility) passed++; else failed++;

console.log('\n───────────────────────────────────────────────────────────────────────────\n');
console.log('📋 TEST 3: Edge Cases\n');

// Test null/undefined
const nullResult = normalizeRole(undefined);
const emptyResult = normalizeRole('');
const unknownResult = normalizeRole('UNKNOWN_ROLE');

console.log(`${nullResult === null ? '✅' : '❌'} undefined → null`);
console.log(`${emptyResult === null ? '✅' : '❌'} empty string → null`);
console.log(`${unknownResult === null ? '✅' : '❌'} unknown role → null`);

if (nullResult === null) passed++; else failed++;
if (emptyResult === null) passed++; else failed++;
if (unknownResult === null) passed++; else failed++;

console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('📊 TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

console.log(`Total Tests:  ${passed + failed}`);
console.log(`✅ Passed:    ${passed}`);
console.log(`❌ Failed:    ${failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

if (failed === 0) {
  console.log('🎉 ALL TESTS PASSED - JWT normalization is RLS-compatible!\n');
  process.exit(0);
} else {
  console.log('❌ TESTS FAILED - Fix role normalization before deploying!\n');
  process.exit(1);
}
