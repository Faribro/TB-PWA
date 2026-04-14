const { randomUUID } = require('crypto');

const WEBHOOK_URL = 'http://localhost:3000/api/webhook/kobo';
const WEBHOOK_SECRET = 'alliance_kobo_secure_2026';

const testUuid = randomUUID();

const mockPayload = {
  _uuid: testUuid,
  _id: Math.floor(Math.random() * 1000000),
  _submission_time: new Date().toISOString(),
  _submitted_by: 'test_user',
  
  'grp_screening/staff_name': 'Dr. Test Kumar',
  'grp_screening/screening_state': 'madhya_pradesh',
  'grp_screening/screening_district': 'Gwalior',
  'grp_screening/facility_code': 'CJ',
  'grp_screening/facility_type': 'prison',
  'grp_screening/screening_date': '2025-01-26',
  
  'grp_identity/inmate_name': 'Test Patient Kumar',
  'grp_identity/inmate_type': 'under_trial',
  
  'grp_demo/age': '35',
  'grp_demo/sex': 'male',
  
  'grp_tb/xray_result': 'normal',
  
  _geolocation: [26.2183, 78.1828],
};

async function testWebhook() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 KOBO WEBHOOK SIMPLE TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Test UUID: ${testUuid}`);
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  console.log('📤 Sending POST request...\n');
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-kobo-webhook-secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify(mockPayload),
    });
    
    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('\n✅ Webhook accepted request');
      console.log('\n📋 NEXT STEPS:');
      console.log('   1. Check your dev server console for these logs:');
      console.log('      [webhook] ✅ Upserted record: ' + testUuid);
      console.log('   2. If you see errors, they will show the exact problem');
      console.log('   3. Common errors:');
      console.log('      - Column name mismatch (e.g., "state" vs "screening_state")');
      console.log('      - Missing required fields');
      console.log('      - RLS policy blocking insert');
      console.log('\n   4. To verify record in database, run:');
      console.log(`      SELECT * FROM patients WHERE kobo_uuid = '${testUuid}';`);
      console.log('      in Supabase SQL Editor\n');
    } else {
      console.log('\n❌ Webhook rejected request');
      console.log('   Check error message above\n');
    }
    
  } catch (error) {
    console.error('\n❌ Network error:', error.message);
    console.error('   Is dev server running? Run: bun run dev\n');
    process.exit(1);
  }
}

testWebhook();
