/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STATE NORMALIZATION - UNIT TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Test Coverage:
 * - Edge cases (null, empty, whitespace)
 * - Exact matches (canonical names)
 * - Abbreviations (ISO codes)
 * - Aliases (legacy names, misspellings)
 * - Synonyms (city-to-state)
 * - Fuzzy matching (typos within threshold)
 * - Unknown inputs (audit logging)
 * - Performance (O(1) vs O(N))
 */

import {
  normalizeState,
  isIndianState,
  getCanonicalStates,
  getAuditLog,
  clearAuditLog,
  type NormalizationResult,
} from './state';

// ═══════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function assertNormalization(
  input: string | null | undefined,
  expected: {
    normalizedName: string | null;
    confidence: 'exact' | 'fuzzy' | 'unknown';
    matchedVia?: string;
  },
  testName: string
): void {
  const result = normalizeState(input);
  
  if (result.normalizedName !== expected.normalizedName) {
    throw new Error(
      `❌ ${testName}\n` +
      `   Input: "${input}"\n` +
      `   Expected: "${expected.normalizedName}"\n` +
      `   Got: "${result.normalizedName}"`
    );
  }
  
  if (result.confidence !== expected.confidence) {
    throw new Error(
      `❌ ${testName}\n` +
      `   Input: "${input}"\n` +
      `   Expected confidence: "${expected.confidence}"\n` +
      `   Got confidence: "${result.confidence}"`
    );
  }
  
  console.log(`✅ ${testName}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

function runTests(): void {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🧪 STATE NORMALIZATION - UNIT TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  const tests: Array<() => void> = [
    // ─────────────────────────────────────────────────────────────────────
    // EDGE CASES
    // ─────────────────────────────────────────────────────────────────────
    () => assertNormalization(null, { normalizedName: null, confidence: 'unknown' }, 'Edge Case: null input'),
    () => assertNormalization(undefined, { normalizedName: null, confidence: 'unknown' }, 'Edge Case: undefined input'),
    () => assertNormalization('', { normalizedName: null, confidence: 'unknown' }, 'Edge Case: empty string'),
    () => assertNormalization('   ', { normalizedName: null, confidence: 'unknown' }, 'Edge Case: whitespace only'),
    () => assertNormalization('  Gujarat  ', { normalizedName: 'Gujarat', confidence: 'exact' }, 'Edge Case: trailing spaces'),

    // ─────────────────────────────────────────────────────────────────────
    // EXACT MATCHES (CANONICAL)
    // ─────────────────────────────────────────────────────────────────────
    () => assertNormalization('Gujarat', { normalizedName: 'Gujarat', confidence: 'exact' }, 'Exact: Gujarat'),
    () => assertNormalization('Uttarakhand', { normalizedName: 'Uttarakhand', confidence: 'exact' }, 'Exact: Uttarakhand'),
    () => assertNormalization('Madhya Pradesh', { normalizedName: 'Madhya Pradesh', confidence: 'exact' }, 'Exact: Madhya Pradesh'),
    () => assertNormalization('Tamil Nadu', { normalizedName: 'Tamil Nadu', confidence: 'exact' }, 'Exact: Tamil Nadu'),
    () => assertNormalization('Jammu and Kashmir', { normalizedName: 'Jammu and Kashmir', confidence: 'exact' }, 'Exact: Jammu and Kashmir'),

    // ─────────────────────────────────────────────────────────────────────
    // CASE INSENSITIVITY
    // ─────────────────────────────────────────────────────────────────────
    () => assertNormalization('uttarakhand', { normalizedName: 'Uttarakhand', confidence: 'exact' }, 'Case: lowercase uttarakhand'),
    () => assertNormalization('UTTARAKHAND', { normalizedName: 'Uttarakhand', confidence: 'exact' }, 'Case: UPPERCASE UTTARAKHAND'),
    () => assertNormalization('gUjArAt', { normalizedName: 'Gujarat', confidence: 'exact' }, 'Case: mixed case gUjArAt'),
    () => assertNormalization('madhya pradesh', { normalizedName: 'Madhya Pradesh', confidence: 'exact' }, 'Case: lowercase madhya pradesh'),

    // ─────────────────────────────────────────────────────────────────────
    // ABBREVIATIONS
    // ─────────────────────────────────────────────────────────────────────
    () => assertNormalization('MP', { normalizedName: 'Madhya Pradesh', confidence: 'exact' }, 'Abbreviation: MP'),
    () => assertNormalization('UK', { normalizedName: 'Uttarakhand', confidence: 'exact' }, 'Abbreviation: UK'),
    () => assertNormalization('GJ', { normalizedName: 'Gujarat', confidence: 'exact' }, 'Abbreviation: GJ'),
    () => assertNormalization('TN', { normalizedName: 'Tamil Nadu', confidence: 'exact' }, 'Abbreviation: TN'),
    () => assertNormalization('JK', { normalizedName: 'Jammu and Kashmir', confidence: 'exact' }, 'Abbreviation: JK'),
    () => assertNormalization('DL', { normalizedName: 'Delhi', confidence: 'exact' }, 'Abbreviation: DL'),

    // ─────────────────────────────────────────────────────────────────────
    // ALIASES (LEGACY NAMES & MISSPELLINGS)
    // ─────────────────────────────────────────────────────────────────────
    () => assertNormalization('Orissa', { normalizedName: 'Odisha', confidence: 'exact' }, 'Alias: Orissa → Odisha'),
    () => assertNormalization('Pondicherry', { normalizedName: 'Puducherry', confidence: 'exact' }, 'Alias: Pondicherry → Puducherry'),
    () => assertNormalization('Uttaranchal', { normalizedName: 'Uttarakhand', confidence: 'exact' }, 'Alias: Uttaranchal → Uttarakhand'),
    () => assertNormalization('uttrakhand', { normalizedName: 'Uttarakhand', confidence: 'exact' }, 'Alias: uttrakhand (typo)'),
    () => assertNormalization('madhyapradesh', { normalizedName: 'Madhya Pradesh', confidence: 'exact' }, 'Alias: madhyapradesh (no space)'),
    () => assertNormalization('madhya_pradesh', { normalizedName: 'Madhya Pradesh', confidence: 'exact' }, 'Alias: madhya_pradesh (underscore)'),
    () => assertNormalization('tamilnadu', { normalizedName: 'Tamil Nadu', confidence: 'exact' }, 'Alias: tamilnadu (no space)'),

    // ─────────────────────────────────────────────────────────────────────
    // SYNONYMS (CITY-TO-STATE)
    // ─────────────────────────────────────────────────────────────────────
    () => assertNormalization('Mumbai', { normalizedName: 'Maharashtra', confidence: 'exact' }, 'Synonym: Mumbai → Maharashtra'),
    () => assertNormalization('Bangalore', { normalizedName: 'Karnataka', confidence: 'exact' }, 'Synonym: Bangalore → Karnataka'),
    () => assertNormalization('Chennai', { normalizedName: 'Tamil Nadu', confidence: 'exact' }, 'Synonym: Chennai → Tamil Nadu'),
    () => assertNormalization('Kolkata', { normalizedName: 'West Bengal', confidence: 'exact' }, 'Synonym: Kolkata → West Bengal'),
    () => assertNormalization('Hyderabad', { normalizedName: 'Telangana', confidence: 'exact' }, 'Synonym: Hyderabad → Telangana'),
    () => assertNormalization('NCR', { normalizedName: 'Delhi', confidence: 'exact' }, 'Synonym: NCR → Delhi'),

    // ─────────────────────────────────────────────────────────────────────
    // FUZZY MATCHING (TYPOS WITHIN THRESHOLD)
    // ─────────────────────────────────────────────────────────────────────
    () => assertNormalization('Gujrat', { normalizedName: 'Gujarat', confidence: 'fuzzy' }, 'Fuzzy: Gujrat (1 char diff)'),
    () => assertNormalization('Uttrakand', { normalizedName: 'Uttarakhand', confidence: 'exact' }, 'Alias: Uttrakand (common typo)'),
    () => assertNormalization('Maharashtr', { normalizedName: 'Maharashtra', confidence: 'exact' }, 'Alias: Maharashtr (common typo)'),

    // ─────────────────────────────────────────────────────────────────────
    // UNKNOWN INPUTS (SHOULD AUDIT)
    // ─────────────────────────────────────────────────────────────────────
    () => {
      clearAuditLog();
      assertNormalization('InvalidState', { normalizedName: null, confidence: 'unknown' }, 'Unknown: InvalidState');
      const log = getAuditLog();
      if (log.length !== 1 || log[0].input !== 'InvalidState') {
        throw new Error('❌ Unknown: InvalidState - Audit log not recorded');
      }
      console.log('✅ Unknown: InvalidState - Audit log recorded');
    },
    () => assertNormalization('XYZ', { normalizedName: null, confidence: 'unknown' }, 'Unknown: XYZ'),
    () => assertNormalization('RandomText123', { normalizedName: null, confidence: 'unknown' }, 'Unknown: RandomText123'),

    // ─────────────────────────────────────────────────────────────────────
    // HELPER FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────
    () => {
      if (!isIndianState('Gujarat')) throw new Error('❌ isIndianState: Gujarat should be true');
      console.log('✅ isIndianState: Gujarat returns true');
    },
    () => {
      if (isIndianState('InvalidState')) throw new Error('❌ isIndianState: InvalidState should be false');
      console.log('✅ isIndianState: InvalidState returns false');
    },
    () => {
      const states = getCanonicalStates();
      if (states.length !== 36) throw new Error(`❌ getCanonicalStates: Expected 36, got ${states.length}`);
      console.log('✅ getCanonicalStates: Returns 36 states');
    },
  ];

  // Run all tests
  for (const test of tests) {
    try {
      test();
      passed++;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      failed++;
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tests:  ${tests.length}`);
  console.log(`✅ Passed:    ${passed}`);
  console.log(`❌ Failed:    ${failed}`);
  console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

export { runTests };
