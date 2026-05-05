/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SANITIZE PATIENT UPDATE - UNIT TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Test Coverage:
 * - Non-database field filtering
 * - Screening date retention
 * - All valid database fields
 * - Edge cases (empty objects, null values)
 */

// ═══════════════════════════════════════════════════════════════════════════
// FUNCTION UNDER TEST (copied from sanitizePatientUpdate.ts)
// ═══════════════════════════════════════════════════════════════════════════

const NON_DB_FIELDS = new Set([
  'id',
  'kobo_uuid',
  'sheets_synced_at',
  'synced_to_sheets',
  'sync_status',
  'sync_error',
  'synced_to_sheets_at',
  'created_at',
  'updated_at',
  'client_timestamp',
  'dirty',
]);

export function sanitizePatientUpdate(update: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(update)) {
    if (!NON_DB_FIELDS.has(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function assertSanitization(
  input: Record<string, unknown>,
  expected: Record<string, unknown>,
  testName: string
): void {
  const result = sanitizePatientUpdate(input);
  
  const resultKeys = Object.keys(result).sort();
  const expectedKeys = Object.keys(expected).sort();
  
  if (resultKeys.join(',') !== expectedKeys.join(',')) {
    throw new Error(
      `❌ ${testName}\n` +
      `   Expected keys: ${expectedKeys.join(', ')}\n` +
      `   Got keys: ${resultKeys.join(', ')}`
    );
  }
  
  for (const key of expectedKeys) {
    if (result[key] !== expected[key]) {
      throw new Error(
        `❌ ${testName}\n` +
        `   Field "${key}": expected "${expected[key]}", got "${result[key]}"`
      );
    }
  }
  
  console.log(`✅ ${testName}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

function runTests(): void {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🧪 SANITIZE PATIENT UPDATE - UNIT TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  const tests: Array<() => void> = [
    // ─────────────────────────────────────────────────────────────────────
    // SCREENING DATE RETENTION (CRITICAL FOR THE BUG)
    // ─────────────────────────────────────────────────────────────────────
    () => assertSanitization(
      { screening_date: '2026-05-01' },
      { screening_date: '2026-05-01' },
      'Screening date: should be retained'
    ),
    () => assertSanitization(
      { screening_date: '2026-05-02', id: 'patient-123' },
      { screening_date: '2026-05-02' },
      'Screening date: retained while id is filtered'
    ),

    // ─────────────────────────────────────────────────────────────────────
    // NON-DB FIELD FILTERING
    // ─────────────────────────────────────────────────────────────────────
    () => assertSanitization(
      { id: 'patient-123' },
      {},
      'Non-DB field: id should be filtered'
    ),
    () => assertSanitization(
      { kobo_uuid: 'abc-123' },
      {},
      'Non-DB field: kobo_uuid should be filtered'
    ),
    () => assertSanitization(
      { sheets_synced_at: '2026-05-01T00:00:00Z' },
      {},
      'Non-DB field: sheets_synced_at should be filtered'
    ),
    () => assertSanitization(
      { synced_to_sheets: true },
      {},
      'Non-DB field: synced_to_sheets should be filtered'
    ),
    () => assertSanitization(
      { sync_status: 'pending' },
      {},
      'Non-DB field: sync_status should be filtered'
    ),
    () => assertSanitization(
      { sync_error: 'error message' },
      {},
      'Non-DB field: sync_error should be filtered'
    ),
    () => assertSanitization(
      { synced_to_sheets_at: '2026-05-01T00:00:00Z' },
      {},
      'Non-DB field: synced_to_sheets_at should be filtered'
    ),
    () => assertSanitization(
      { created_at: '2026-05-01T00:00:00Z' },
      {},
      'Non-DB field: created_at should be filtered'
    ),
    () => assertSanitization(
      { updated_at: '2026-05-01T00:00:00Z' },
      {},
      'Non-DB field: updated_at should be filtered'
    ),
    () => assertSanitization(
      { client_timestamp: '2026-05-01T00:00:00Z' },
      {},
      'Non-DB field: client_timestamp should be filtered'
    ),
    () => assertSanitization(
      { dirty: true },
      {},
      'Non-DB field: dirty should be filtered'
    ),

    // ─────────────────────────────────────────────────────────────────────
    // VALID DATABASE FIELDS (SHOULD BE RETAINED)
    // ─────────────────────────────────────────────────────────────────────
    () => assertSanitization(
      { inmate_name: 'John Doe' },
      { inmate_name: 'John Doe' },
      'DB field: inmate_name should be retained'
    ),
    () => assertSanitization(
      { age: 35 },
      { age: 35 },
      'DB field: age should be retained'
    ),
    () => assertSanitization(
      { sex: 'male' },
      { sex: 'male' },
      'DB field: sex should be retained'
    ),
    () => assertSanitization(
      { contact_number: '1234567890' },
      { contact_number: '1234567890' },
      'DB field: contact_number should be retained'
    ),
    () => assertSanitization(
      { address: '123 Main St' },
      { address: '123 Main St' },
      'DB field: address should be retained'
    ),
    () => assertSanitization(
      { facility_name: 'CJ' },
      { facility_name: 'CJ' },
      'DB field: facility_name should be retained'
    ),
    () => assertSanitization(
      { date_of_birth: '1990-06-15' },
      { date_of_birth: '1990-06-15' },
      'DB field: date_of_birth should be retained'
    ),
    () => assertSanitization(
      { staff_name: 'Ratna Patil' },
      { staff_name: 'Ratna Patil' },
      'DB field: staff_name should be retained'
    ),
    () => assertSanitization(
      { submitted_on: '2026-05-01' },
      { submitted_on: '2026-05-01' },
      'DB field: submitted_on should be retained'
    ),
    () => assertSanitization(
      { screening_state: 'Gujarat' },
      { screening_state: 'Gujarat' },
      'DB field: screening_state should be retained'
    ),
    () => assertSanitization(
      { screening_district: 'surat' },
      { screening_district: 'surat' },
      'DB field: screening_district should be retained'
    ),
    () => assertSanitization(
      { facility_type: 'prison' },
      { facility_type: 'prison' },
      'DB field: facility_type should be retained'
    ),
    () => assertSanitization(
      { unique_id: 'ABC123' },
      { unique_id: 'ABC123' },
      'DB field: unique_id should be retained'
    ),
    () => assertSanitization(
      { inmate_type: 'inmate' },
      { inmate_type: 'inmate' },
      'DB field: inmate_type should be retained'
    ),
    () => assertSanitization(
      { father_husband_name: 'Father Name' },
      { father_husband_name: 'Father Name' },
      'DB field: father_husband_name should be retained'
    ),
    () => assertSanitization(
      { xray_result: 'NORMAL' },
      { xray_result: 'NORMAL' },
      'DB field: xray_result should be retained'
    ),
    () => assertSanitization(
      { symptoms_10s: 'symptoms' },
      { symptoms_10s: 'symptoms' },
      'DB field: symptoms_10s should be retained'
    ),
    () => assertSanitization(
      { tb_past_history: 'yes' },
      { tb_past_history: 'yes' },
      'DB field: tb_past_history should be retained'
    ),

    // ─────────────────────────────────────────────────────────────────────
    // MIXED VALID AND INVALID FIELDS
    // ─────────────────────────────────────────────────────────────────────
    () => assertSanitization(
      {
        id: 'patient-123',
        screening_date: '2026-05-01',
        inmate_name: 'John Doe',
        kobo_uuid: 'abc-123',
        age: 35,
        sheets_synced_at: '2026-05-01T00:00:00Z',
      },
      {
        screening_date: '2026-05-01',
        inmate_name: 'John Doe',
        age: 35,
      },
      'Mixed fields: only DB fields retained'
    ),

    // ─────────────────────────────────────────────────────────────────────
    // EDGE CASES
    // ─────────────────────────────────────────────────────────────────────
    () => assertSanitization(
      {},
      {},
      'Edge case: empty object'
    ),
    () => assertSanitization(
      { id: '', kobo_uuid: '' },
      {},
      'Edge case: empty string values for non-DB fields'
    ),
    () => assertSanitization(
      { id: null, kobo_uuid: undefined },
      {},
      'Edge case: null/undefined values for non-DB fields'
    ),
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
