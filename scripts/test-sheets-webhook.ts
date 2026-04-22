// ═══════════════════════════════════════════════════════════════════════════
// 🧪 GOOGLE SHEETS WEBHOOK DIRECT TEST
// ═══════════════════════════════════════════════════════════════════════════
// Tests the Google Sheets webhook directly with a sample patient update

const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyBwLUKiFDY-eLdNOIzNZRsyem0rWiTA6IvelapBjHg8sGdtkTuhQs2hGbXrydeUZSu/exec';

async function testWebhook() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 GOOGLE SHEETS WEBHOOK DIRECT TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Webhook URL: ${WEBHOOK_URL}\n`);

  const testPatient = {
    kobo_uuid: 'test-' + Date.now(),
    unique_id: 'TEST-001',
    inmate_name: 'Test Patient',
    age: '35',
    sex: 'Male',
    facility_name: 'Test Facility',
    screening_date: new Date().toISOString(),
    referral_date: new Date().toISOString(),
    referred_facility: 'DMC-Designated microscopy Centre',
    tb_diagnosed: 'Y',
    tb_diagnosis_date: new Date().toISOString(),
    att_start_date: new Date().toISOString(),
    nikshay_abha_id: 'TEST123456',
    remarks: 'Test update from webhook test script'
  };

  const payload = {
    batch: [testPatient],
    batch_id: `test-${Date.now()}`,
    operation: 'UPDATE'
  };

  console.log('📤 Sending test payload...');
  console.log(JSON.stringify(payload, null, 2));
  console.log('');

  try {
    const startTime = Date.now();
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });
    const duration = Date.now() - startTime;

    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    const text = await response.text();
    console.log(`📄 Response body: ${text}`);
    console.log('');

    if (response.ok) {
      console.log('✅ Webhook test PASSED');
      console.log('📝 Check your Google Sheet for the test record');
    } else {
      console.log('❌ Webhook test FAILED');
      console.log(`Error: ${response.status} - ${text}`);
    }
  } catch (error: any) {
    console.log('❌ Webhook test FAILED');
    console.error('Error:', error.message);
  }

  console.log('═══════════════════════════════════════════════════════════════════════════');
}

testWebhook();
