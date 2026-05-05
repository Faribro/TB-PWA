/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DATE FORMATTING - UNIT TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Test Coverage:
 * - Edge cases (null, undefined, empty strings)
 * - HTML5 date input format (yyyy-MM-dd)
 * - ISO 8601 timestamps with timezone
 * - Various date string formats
 * - Timezone offset handling
 * - Invalid dates
 */

// ═══════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function assertEqual(
  actual: string,
  expected: string,
  testName: string
): void {
  if (actual !== expected) {
    throw new Error(
      `❌ ${testName}\n` +
      `   Expected: "${expected}"\n` +
      `   Got: "${actual}"`
    );
  }
  console.log(`✅ ${testName}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCTION UNDER TEST
// ═══════════════════════════════════════════════════════════════════════════

const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  try {
    // If it's already in yyyy-MM-dd format, validate and return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Validate the date is actually valid
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      // Check if the date was auto-corrected by checking year/month/day
      const parts = dateStr.split('-');
      if (date.getFullYear() !== parseInt(parts[0]) || 
          (date.getMonth() + 1) !== parseInt(parts[1]) || 
          date.getDate() !== parseInt(parts[2])) {
        return ''; // Invalid date like 2026-13-01 or 2026-05-32
      }
      return dateStr;
    }
    // Handle ISO timestamps with timezone (e.g., "2026-05-01T00:00:00+00:00")
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    // Use local date parts to avoid timezone offset issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

function runTests(): void {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🧪 DATE FORMATTING - UNIT TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  const tests: Array<() => void> = [
    // ─────────────────────────────────────────────────────────────────────
    // EDGE CASES
    // ─────────────────────────────────────────────────────────────────────
    () => assertEqual(formatDateForInput(null), '', 'Edge Case: null input'),
    () => assertEqual(formatDateForInput(undefined), '', 'Edge Case: undefined input'),
    () => assertEqual(formatDateForInput(''), '', 'Edge Case: empty string'),
    () => assertEqual(formatDateForInput('   '), '', 'Edge Case: whitespace only'),
    () => assertEqual(formatDateForInput('invalid'), '', 'Edge Case: invalid date string'),

    // ─────────────────────────────────────────────────────────────────────
    // HTML5 DATE INPUT FORMAT (yyyy-MM-dd) - SHOULD RETURN AS-IS
    // ─────────────────────────────────────────────────────────────────────
    () => assertEqual(formatDateForInput('2026-05-01'), '2026-05-01', 'HTML5 format: 2026-05-01'),
    () => assertEqual(formatDateForInput('2024-12-31'), '2024-12-31', 'HTML5 format: 2024-12-31'),
    () => assertEqual(formatDateForInput('2020-01-01'), '2020-01-01', 'HTML5 format: 2020-01-01'),
    () => assertEqual(formatDateForInput('1990-06-15'), '1990-06-15', 'HTML5 format: 1990-06-15'),

    // ─────────────────────────────────────────────────────────────────────
    // ISO 8601 TIMESTAMPS WITH TIMEZONE
    // ─────────────────────────────────────────────────────────────────────
    () => assertEqual(formatDateForInput('2026-05-01T00:00:00+00:00'), '2026-05-01', 'ISO timestamp: UTC'),
    () => assertEqual(formatDateForInput('2026-05-01T00:00:00Z'), '2026-05-01', 'ISO timestamp: Z suffix'),
    () => assertEqual(formatDateForInput('2026-05-01T12:30:45+05:30'), '2026-05-01', 'ISO timestamp: IST'),
    () => assertEqual(formatDateForInput('2026-05-01T18:00:00-08:00'), '2026-05-02', 'ISO timestamp: PST (timezone conversion)'),
    () => assertEqual(formatDateForInput('2026-05-01T00:00:00.000Z'), '2026-05-01', 'ISO timestamp: with milliseconds'),

    // ─────────────────────────────────────────────────────────────────────
    // VARIOUS DATE STRING FORMATS
    // ─────────────────────────────────────────────────────────────────────
    () => assertEqual(formatDateForInput('2026/05/01'), '2026-05-01', 'Slash format: 2026/05/01'),
    () => assertEqual(formatDateForInput('May 1, 2026'), '2026-05-01', 'US format: May 1, 2026'),
    () => assertEqual(formatDateForInput('1 May 2026'), '2026-05-01', 'UK format: 1 May 2026'),
    () => assertEqual(formatDateForInput('2026-05-01 00:00:00'), '2026-05-01', 'Space format: 2026-05-01 00:00:00'),

    // ─────────────────────────────────────────────────────────────────────
    // TIMEZONE OFFSET HANDLING - SHOULD USE LOCAL DATE PARTS
    // ─────────────────────────────────────────────────────────────────────
    () => {
      const result = formatDateForInput('2026-05-01T23:59:59+00:00');
      if (result !== '2026-05-01' && result !== '2026-05-02') {
        throw new Error(`❌ Timezone offset: Expected 2026-05-01 or 2026-05-02, got ${result}`);
      }
      console.log(`✅ Timezone offset: 2026-05-01T23:59:59+00:00 → ${result} (local time)`);
    },

    // ─────────────────────────────────────────────────────────────────────
    // INVALID DATES
    // ─────────────────────────────────────────────────────────────────────
    () => assertEqual(formatDateForInput('2026-13-01'), '', 'Invalid: Month 13'),
    () => assertEqual(formatDateForInput('2026-05-32'), '', 'Invalid: Day 32'),
    () => assertEqual(formatDateForInput('not-a-date'), '', 'Invalid: not-a-date'),
    () => assertEqual(formatDateForInput('NaN'), '', 'Invalid: NaN'),
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
