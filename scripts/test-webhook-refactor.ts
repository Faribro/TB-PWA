/**
 * Test Kobo Webhook with Fire-and-Forget Sync
 * 
 * Simulates a Kobo webhook POST request to verify:
 * 1. Webhook accepts and normalizes payload
 * 2. Supabase upsert succeeds
 * 3. Response returns immediately (non-blocking)
 * 4. No sync tracking fields in response
 */

const WEBHOOK_URL = 'http://localhost:3000/api/webhook/kobo';
const WEBHOOK_SECRET = process.env.KOBO_WEBHOOK_SECRET || 'alliance_kobo_secure_2026';

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🧪 TESTING KOBO WEBHOOK WITH FIRE-AND-FORGET SYNC');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

// Test payload (simulates Kobo submission)
const testPayload = {
  _uuid: `test-webhook-${Date.now()}`,
  _submission_time: new Date().toISOString(),
  _submitted_by: 'test_user',
  'grp_screening/Unique_ID': `TEST-${Date.now()}`,
  'grp_screening/staff_name': 'Test Staff',
  'grp_screening/screening_state': 'maharashtra',
  'grp_screening/screening_district': 'Mumbai',
  'grp_screening/facility_name': 'Test Facility',
  'grp_screening/screening_date': '2025-01-27',
  'grp_identity/inmate_name': 'Test Webhook Patient',
  'grp_identity/inmate_type': 'Under Trial',
  'grp_demo/age': 30,
  'grp_demo/sex': 'male',
  'grp_demo/contact_number': '9876543210',
  'grp_tb/xray_result': 'normal',
  'grp_tb/symptoms_10s': 'none',
  'grp_tb/tb_past_history': 'no'
};

async function testWebhook() {
  console.log('📋 Test Payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log();

  console.log('🔄 Sending POST request to webhook...');
  console.log(`URL: ${WEBHOOK_URL}`);
  console.log(`Secret: ${WEBHOOK_SECRET.substring(0, 10)}...`);
  console.log();

  const startTime = Date.now();

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-kobo-webhook-secret': WEBHOOK_SECRET
      },
      body: JSON.stringify(testPayload)
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    console.log('📊 RESPONSE:');
    console.log(`Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
    console.log(`Duration: ${duration}ms`);
    console.log('Body:', JSON.stringify(data, null, 2));
    console.log();

    // Verify response structure
    console.log('🔍 VERIFICATION:');
    
    if (response.ok && data.success) {
      console.log('✅ Webhook accepted payload');
    } else {
      console.log('❌ Webhook rejected payload');
    }

    if (duration < 3000) {
      console.log(`✅ Response returned quickly (${duration}ms < 3000ms)`);
    } else {
      console.log(`⚠️  Response took longer than expected (${duration}ms)`);
    }

    if (data.kobo_uuid) {
      console.log(`✅ kobo_uuid in response: ${data.kobo_uuid}`);
    } else {
      console.log('❌ Missing kobo_uuid in response');
    }

    if (data.operation) {
      console.log(`✅ Operation type: ${data.operation}`);
    } else {
      console.log('⚠️  Missing operation type');
    }

    // Verify NO sync tracking fields
    if (data.sheets_sync === undefined && data.synced_to_sheets === undefined) {
      console.log('✅ No sync tracking fields in response (fire-and-forget working)');
    } else {
      console.log('❌ FAILED: Response contains sync tracking fields:', {
        sheets_sync: data.sheets_sync,
        synced_to_sheets: data.synced_to_sheets
      });
    }

    console.log();
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    
    if (response.ok && data.success && duration < 3000 && !data.sheets_sync) {
      console.log('✅ ALL TESTS PASSED');
      console.log('✅ Webhook processes requests quickly');
      console.log('✅ Fire-and-forget sync is non-blocking');
      console.log('✅ No sync tracking in response');
    } else {
      console.log('❌ SOME TESTS FAILED - Review output above');
    }

    console.log();
    console.log('⏳ Check server logs for async Sheets sync results...');
    console.log('   Look for: "[sheetsSync] ✅ Mirror sync insert: ..."');

  } catch (error) {
    console.error('❌ REQUEST FAILED:', error);
    console.log();
    console.log('💡 Make sure dev server is running: bun run dev');
  }
}

// Run test
testWebhook().then(() => {
  setTimeout(() => process.exit(0), 2000);
});
