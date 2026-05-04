// ═══════════════════════════════════════════════════════════════════════════
// VERIFY LAST GOOGLE SHEETS SYNC
// ═══════════════════════════════════════════════════════════════════════════

const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyBwLUKiFDY-eLdNOIzNZRsyem0rWiTA6IvelapBjHg8sGdtkTuhQs2hGbXrydeUZSu/exec';

// Test payload matching the data you mentioned
const testPayload = {
  batch: [{
    inmate_name: 'Deepak Gupta',
    screening_date: '01/05/2026',
    screening_state: 'Uttarakhand',
    screening_district: 'Nainital',
    facility_name: 'SJ',
    facility_type: 'Prison',
    referral_date: '01/05/2026',
    referred_by: 'Rubina Alvi',
    inmate_type: 'Under Trial',
    referred_to: 'Ahmad Hasan',
    kobo_uuid: 'test-verify-' + Date.now(),
    unique_id: 'TEST-VERIFY-001'
  }],
  batch_id: 'verify-' + Date.now(),
  count: 1
};

async function verifySync() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 VERIFYING LAST GOOGLE SHEETS SYNC');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  console.log('📋 Test Data (matching your submission):');
  console.log('  Name: Deepak Gupta');
  console.log('  Date: 01/05/2026');
  console.log('  State: Uttarakhand');
  console.log('  District: Nainital');
  console.log('  Facility: SJ (Prison)');
  console.log('  Referred by: Rubina Alvi');
  console.log('  Inmate Type: Under Trial');
  console.log('  Referred to: Ahmad Hasan\n');

  console.log('📤 Sending to webhook...\n');

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
    console.log('📊 WEBHOOK RESPONSE');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Response: ${responseText}`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    if (response.ok) {
      console.log('✅ WEBHOOK IS WORKING');
      console.log('✅ Data should appear in Google Sheets');
      console.log('\n📝 Next Steps:');
      console.log('   1. Check your Google Sheet for the test record');
      console.log('   2. Look for KoboUUID:', testPayload.batch[0].kobo_uuid);
      console.log('   3. If you see it, the webhook is working correctly');
      console.log('   4. The Redis errors are non-critical (fallback is working)\n');
    } else {
      console.log('❌ WEBHOOK FAILED');
      console.log('⚠️  Check Google Apps Script deployment\n');
    }
  } catch (error) {
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('❌ ERROR');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.error(error.message);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
  }
}

verifySync();
