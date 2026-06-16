/**
 * scripts/test-register-context-validation.ts
 *
 * Test suite for register context validation.
 * Run: bun run scripts/test-register-context-validation.ts
 */

import {
  extractRegisterContext,
  validateRegisterContext,
  buildValidationErrorResponse,
  type RegisterContext,
  type SessionContext,
} from '../lib/reconciliation/registerContextValidator';
import type { NormalizedExtractedRow } from '../lib/reconciliation/sessionTypes';

// ═══════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════

function createMockRow(
  sno: number,
  overrides: Partial<NormalizedExtractedRow> = {}
): NormalizedExtractedRow {
  return {
    sno,
    name: 'Test Patient',
    normalizedName: 'TEST PATIENT',
    father_name: 'Test Father',
    age: 30,
    mobile: '9876543210',
    normalizedMobile: '9876543210',
    ward: 'Ward A',
    address: 'Test Address',
    state: 'MAHARASHTRA',
    district: 'PUNE',
    facility: 'YERAWADA CENTRAL JAIL',
    screening_date: '2025-01-15',
    confidence_score: 1.0,
    rowFingerprint: 'TEST|30|9876543210',
    rawInputSnapshot: {},
    isDuplicateInFile: false,
    duplicateOfSno: null,
    ...overrides,
  };
}

interface TestCase {
  name: string;
  rows: NormalizedExtractedRow[];
  sessionContext: SessionContext;
  expectedValid: boolean;
  expectedMismatches?: number;
  expectedWarnings?: number;
}

// ═══════════════════════════════════════════════════════
// Test Cases
// ═══════════════════════════════════════════════════════

const testCases: TestCase[] = [
  // ── Exact Match ──
  {
    name: '✅ Exact match (all fields)',
    rows: [
      createMockRow(1, {
        state: 'MAHARASHTRA',
        district: 'PUNE',
        facility: 'YERAWADA CENTRAL JAIL',
        screening_date: '2025-01-15',
      }),
    ],
    sessionContext: {
      screeningState: 'MAHARASHTRA',
      screeningDistrict: 'PUNE',
      facilityName: 'YERAWADA CENTRAL JAIL',
      screeningDate: '2025-01-15',
    },
    expectedValid: true,
    expectedMismatches: 0,
  },

  // ── Casing Differences ──
  {
    name: '✅ Case-insensitive match (Maharashtra vs MAHARASHTRA)',
    rows: [
      createMockRow(1, {
        state: 'Maharashtra',
        district: 'Pune',
        facility: 'Yerawada Central Jail',
        screening_date: '2025-01-15',
      }),
    ],
    sessionContext: {
      screeningState: 'MAHARASHTRA',
      screeningDistrict: 'PUNE',
      facilityName: 'YERAWADA CENTRAL JAIL',
      screeningDate: '2025-01-15',
    },
    expectedValid: true,
    expectedMismatches: 0,
  },

  // ── Spacing Differences ──
  {
    name: '✅ Whitespace normalization (extra spaces)',
    rows: [
      createMockRow(1, {
        state: '  MAHARASHTRA  ',
        district: 'PUNE   DISTRICT',
        facility: 'YERAWADA   CENTRAL   JAIL',
        screening_date: '2025-01-15',
      }),
    ],
    sessionContext: {
      screeningState: 'MAHARASHTRA',
      screeningDistrict: 'PUNE DISTRICT',
      facilityName: 'YERAWADA CENTRAL JAIL',
      screeningDate: '2025-01-15',
    },
    expectedValid: true,
    expectedMismatches: 0,
  },

  // ── Date Format Differences ──
  {
    name: '✅ Date format normalization (DD/MM/YYYY → YYYY-MM-DD)',
    rows: [
      createMockRow(1, {
        state: 'MAHARASHTRA',
        district: 'PUNE',
        facility: 'YERAWADA CENTRAL JAIL',
        screening_date: '15/01/2025',
      }),
    ],
    sessionContext: {
      screeningState: 'MAHARASHTRA',
      screeningDistrict: 'PUNE',
      facilityName: 'YERAWADA CENTRAL JAIL',
      screeningDate: '2025-01-15',
    },
    expectedValid: true,
    expectedMismatches: 0,
  },

  // ── Missing Context Columns ──
  {
    name: '⚠️  Missing state column in register (warning only)',
    rows: [
      createMockRow(1, {
        state: null,
        district: 'PUNE',
        facility: 'YERAWADA CENTRAL JAIL',
        screening_date: '2025-01-15',
      }),
    ],
    sessionContext: {
      screeningState: 'MAHARASHTRA',
      screeningDistrict: 'PUNE',
      facilityName: 'YERAWADA CENTRAL JAIL',
      screeningDate: '2025-01-15',
    },
    expectedValid: true,
    expectedWarnings: 1,
  },

  // ── State Mismatch ──
  {
    name: '❌ State mismatch (MAHARASHTRA vs UTTARAKHAND)',
    rows: [
      createMockRow(1, {
        state: 'MAHARASHTRA',
        district: 'PUNE',
        facility: 'YERAWADA CENTRAL JAIL',
        screening_date: '2025-01-15',
      }),
    ],
    sessionContext: {
      screeningState: 'UTTARAKHAND',
      screeningDistrict: 'DEHRADUN',
      facilityName: 'DEHRADUN JAIL',
      screeningDate: '2025-01-15',
    },
    expectedValid: false,
    expectedMismatches: 3, // state, district, facility
  },

  // ── District Mismatch ──
  {
    name: '❌ District mismatch (PUNE vs MUMBAI)',
    rows: [
      createMockRow(1, {
        state: 'MAHARASHTRA',
        district: 'PUNE',
        facility: 'YERAWADA CENTRAL JAIL',
        screening_date: '2025-01-15',
      }),
    ],
    sessionContext: {
      screeningState: 'MAHARASHTRA',
      screeningDistrict: 'MUMBAI',
      facilityName: 'ARTHUR ROAD JAIL',
      screeningDate: '2025-01-15',
    },
    expectedValid: false,
    expectedMismatches: 2, // district, facility
  },

  // ── Facility Mismatch ──
  {
    name: '❌ Facility mismatch (correct state/district)',
    rows: [
      createMockRow(1, {
        state: 'MAHARASHTRA',
        district: 'PUNE',
        facility: 'YERAWADA CENTRAL JAIL',
        screening_date: '2025-01-15',
      }),
    ],
    sessionContext: {
      screeningState: 'MAHARASHTRA',
      screeningDistrict: 'PUNE',
      facilityName: 'PUNE OPEN JAIL',
      screeningDate: '2025-01-15',
    },
    expectedValid: false,
    expectedMismatches: 1, // facility only
  },

  // ── Date Mismatch ──
  {
    name: '❌ Date mismatch (2025-01-15 vs 2025-01-20)',
    rows: [
      createMockRow(1, {
        state: 'MAHARASHTRA',
        district: 'PUNE',
        facility: 'YERAWADA CENTRAL JAIL',
        screening_date: '2025-01-15',
      }),
    ],
    sessionContext: {
      screeningState: 'MAHARASHTRA',
      screeningDistrict: 'PUNE',
      facilityName: 'YERAWADA CENTRAL JAIL',
      screeningDate: '2025-01-20',
    },
    expectedValid: false,
    expectedMismatches: 1, // date only
  },

  // ── Mixed-Context Rows ──
  {
    name: '❌ Mixed-context file (3 states in one file)',
    rows: [
      createMockRow(1, { state: 'MAHARASHTRA', screening_date: '2025-01-15' }),
      createMockRow(2, { state: 'MAHARASHTRA', screening_date: '2025-01-15' }),
      createMockRow(3, { state: 'UTTARAKHAND', screening_date: '2025-01-15' }),
      createMockRow(4, { state: 'MAHARASHTRA', screening_date: '2025-01-15' }),
      createMockRow(5, { state: 'KARNATAKA', screening_date: '2025-01-15' }),
    ],
    sessionContext: {
      screeningState: 'MAHARASHTRA',
      screeningDistrict: null,
      facilityName: null,
      screeningDate: '2025-01-15',
    },
    expectedValid: true, // Majority is MAHARASHTRA (3/5)
    expectedMismatches: 0,
  },

  // ── Blank Cells ──
  {
    name: '✅ Blank cells handled correctly (null vs null)',
    rows: [
      createMockRow(1, {
        state: null,
        district: null,
        facility: null,
        screening_date: '2025-01-15',
      }),
    ],
    sessionContext: {
      screeningState: null,
      screeningDistrict: null,
      facilityName: null,
      screeningDate: '2025-01-15',
    },
    expectedValid: true,
    expectedMismatches: 0,
  },

  // ── Partial Context ──
  {
    name: '✅ Partial context (state only)',
    rows: [
      createMockRow(1, {
        state: 'MAHARASHTRA',
        district: null,
        facility: null,
        screening_date: '2025-01-15',
      }),
    ],
    sessionContext: {
      screeningState: 'MAHARASHTRA',
      screeningDistrict: null,
      facilityName: null,
      screeningDate: '2025-01-15',
    },
    expectedValid: true,
    expectedMismatches: 0,
  },
];

// ═══════════════════════════════════════════════════════
// Test Runner
// ═══════════════════════════════════════════════════════

function runTests() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 REGISTER CONTEXT VALIDATION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      // Extract register context
      const { context, mixedContextRows } = extractRegisterContext(testCase.rows);

      // Validate against session context
      const validation = validateRegisterContext(context, testCase.sessionContext);

      // Check expectations
      const validMatch = validation.isValid === testCase.expectedValid;
      const mismatchCountMatch =
        testCase.expectedMismatches === undefined ||
        validation.mismatches.length === testCase.expectedMismatches;
      const warningCountMatch =
        testCase.expectedWarnings === undefined ||
        validation.warnings.length === testCase.expectedWarnings;

      if (validMatch && mismatchCountMatch && warningCountMatch) {
        console.log(`✅ PASSED: ${testCase.name}`);
        passed++;
      } else {
        console.log(`❌ FAILED: ${testCase.name}`);
        console.log(`   Expected valid: ${testCase.expectedValid}, got: ${validation.isValid}`);
        console.log(`   Expected mismatches: ${testCase.expectedMismatches ?? 'any'}, got: ${validation.mismatches.length}`);
        console.log(`   Expected warnings: ${testCase.expectedWarnings ?? 'any'}, got: ${validation.warnings.length}`);
        if (validation.mismatches.length > 0) {
          console.log('   Mismatches:', validation.mismatches);
        }
        if (validation.warnings.length > 0) {
          console.log('   Warnings:', validation.warnings);
        }
        if (mixedContextRows.length > 0) {
          console.log('   Mixed-context rows:', mixedContextRows);
        }
        failed++;
      }
    } catch (error) {
      console.log(`❌ FAILED: ${testCase.name}`);
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Total Tests:  ${testCases.length}`);
  console.log(`✅ Passed:    ${passed}`);
  console.log(`❌ Failed:    ${failed}`);
  console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed`);
    process.exit(1);
  }
}

// Run tests
runTests();
