// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE SHEETS WEBHOOK TESTER
// ═══════════════════════════════════════════════════════════════════════════
// Tests if the webhook is receiving data correctly
// ═══════════════════════════════════════════════════════════════════════════

const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyBwLUKiFDY-eLdNOIzNZRsyem0rWiTA6IvelapBjHg8sGdtkTuhQs2hGbXrydeUZSu/exec';

// Test payload matching the last submission you mentioned
const testPayload = {
  'Serial Number': 99999,
  'KoboUUID': 'test-webhook-' + Date.now(),
  'inmate_name': 'Deepak Gupta',
  'date_of_screening': '01/05/2026',
  'state': 'Uttarakhand',
  'district': 'Nainital',
  'facility_type': 'Prison',
  'facility_name': 'SJ',
  'date_of_referral': '01/05/2026',
  'referred_by': 'Rubina Alvi',
  'inmate_type': 'Under Trial',
  'referred_to': 'Ahmad Hasan'
};

async function testWebhook() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 GOOGLE SHEETS WEBHOOK TESTER');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  console.log('📤 Sending test payload to webhook...');
  console.log('URL:', WEBHOOK_URL);
  console.log('\n📋 Payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\n⏳ Waiting for response...\n');

  try {
    const startTime = Date.now();
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const duration = Date.now() - startTime;
    const responseText = await response.text();

    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 RESPONSE');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Response: ${responseText}`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    if (response.ok) {
      console.log('✅ Webhook test PASSED - Data should be in Google Sheets');
      console.log('📝 Check your Google Sheet for the test record with KoboUUID:', testPayload.KoboUUID);
    } else {
      console.log('❌ Webhook test FAILED');
    }
  } catch (error) {
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('❌ ERROR');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.error(error.message);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
  }
}

testWebhook();
