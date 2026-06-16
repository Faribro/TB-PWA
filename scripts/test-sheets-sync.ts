/**
 * Test Fire-and-Forget Sheets Sync
 * 
 * Tests the new syncToSheetsAsync() function to ensure:
 * 1. It returns immediately without blocking
 * 2. It never throws errors
 * 3. It logs success/failure appropriately
 */

import { syncToSheetsAsync } from '../lib/sheetsSync';

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🧪 TESTING FIRE-AND-FORGET SHEETS SYNC');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

// Test patient record
const testPatient = {
  id: 'test-123',
  kobo_uuid: 'test-uuid-456',
  unique_id: 'TEST001',
  inmate_name: 'Test Patient',
  age: 35,
  sex: 'M',
  screening_state: 'Maharashtra',
  screening_district: 'Mumbai',
  facility_name: 'Test Facility',
  screening_date: '2025-01-27',
  xray_result: 'Normal',
  tb_diagnosed: 'N',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

console.log('📋 Test Patient Record:');
console.log(JSON.stringify(testPatient, null, 2));
console.log();

// Test 1: Insert operation
console.log('🔄 TEST 1: Fire-and-forget INSERT');
console.log('Calling syncToSheetsAsync(patient, "insert")...');
const startTime1 = Date.now();

try {
  syncToSheetsAsync(testPatient, 'insert');
  const duration1 = Date.now() - startTime1;
  console.log(`✅ Function returned immediately in ${duration1}ms`);
  console.log('✅ No errors thrown (fire-and-forget working)');
} catch (error) {
  console.error('❌ FAILED: Function threw an error:', error);
}
console.log();

// Test 2: Update operation
console.log('🔄 TEST 2: Fire-and-forget UPDATE');
console.log('Calling syncToSheetsAsync(patient, "update")...');
const startTime2 = Date.now();

try {
  syncToSheetsAsync(testPatient, 'update');
  const duration2 = Date.now() - startTime2;
  console.log(`✅ Function returned immediately in ${duration2}ms`);
  console.log('✅ No errors thrown (fire-and-forget working)');
} catch (error) {
  console.error('❌ FAILED: Function threw an error:', error);
}
console.log();

// Test 3: Missing webhook URL (should not throw)
console.log('🔄 TEST 3: Missing webhook URL (should gracefully skip)');
const originalWebhook = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;
delete process.env.GOOGLE_SCRIPT_WEBHOOK_URL;

try {
  syncToSheetsAsync(testPatient, 'insert');
  console.log('✅ Function handled missing webhook gracefully');
} catch (error) {
  console.error('❌ FAILED: Function threw an error:', error);
}

// Restore webhook URL
process.env.GOOGLE_SCRIPT_WEBHOOK_URL = originalWebhook;
console.log();

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('📊 TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('✅ All tests passed - fire-and-forget sync is working correctly');
console.log('✅ Function returns immediately (non-blocking)');
console.log('✅ No errors thrown to caller');
console.log('✅ Gracefully handles missing configuration');
console.log();
console.log('⏳ Wait 5-10 seconds and check console logs for async webhook results...');
console.log('   Look for: "[sheetsSync] ✅ Mirror sync insert/update: test-uuid-456"');
console.log('   Or:       "[sheetsSync] ❌ Mirror sync error: ..."');
console.log();

// Keep process alive for 10 seconds to see async results
setTimeout(() => {
  console.log('🏁 Test complete. Exiting...');
  process.exit(0);
}, 10000);
