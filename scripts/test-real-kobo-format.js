/**
 * Test webhook with real KoboToolbox UUID format
 */

const WEBHOOK_URL = 'https://hhxr-tb-engine.vercel.app/api/webhook/kobo';
const SECRET = 'alliance_kobo_secure_2026';

// Simulate real KoboToolbox payload with proper UUID
const payload = {
  "_uuid": "MHTHCJ20260415140000",  // KoboToolbox format (not standard UUID)
  "_id": "724305999",
  "_submission_time": "2026-04-15T14:00:00.000Z",
  "grp_screening/staff_name": "Test Staff",
  "grp_screening/screening_state": "maharashtra",
  "grp_screening/screening_district": "Thane",
  "grp_screening/facility_code": "CJ",
  "grp_screening/facility_type": "prison",
  "grp_screening/screening_date": "2026-04-15",
  "grp_identity/inmate_name": "Test Patient April 15",
  "grp_identity/inmate_type": "under_trial",
  "grp_identity/father_husband_name": "Test Father",
  "grp_demo/age": "35",
  "grp_demo/sex": "male",
  "grp_demo/contact_number": "9876543210",
  "grp_tb/xray_result": "normal",
  "grp_tb/symptoms_10s": "no_symptoms",
  "grp_tb/tb_past_history": "no",
  "_geolocation": [19.2183, 72.9781]
};

async function testWebhook() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 TESTING WEBHOOK WITH REAL KOBO FORMAT');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  
  console.log('Payload UUID:', payload._uuid);
  console.log('Screening Date:', payload['grp_screening/screening_date']);
  console.log('Inmate Name:', payload['grp_identity/inmate_name']);
  console.log('\nSending to:', WEBHOOK_URL);
  console.log('');

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-kobo-webhook-secret': SECRET,
      },
      body: JSON.stringify(payload),
    });

    console.log(`Status: ${res.status} ${res.statusText}`);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (res.ok && data.status === 'success') {
      console.log('\n✅ WEBHOOK TEST PASSED!');
      console.log('UUID:', data.uuid);
      console.log('\nWait 5 seconds, then check database with:');
      console.log(`node scripts/check-april15.js`);
    } else {
      console.log('\n❌ WEBHOOK TEST FAILED');
      if (data.error) {
        console.log('Error:', data.error);
      }
    }
  } catch (err) {
    console.error('\n❌ REQUEST FAILED');
    console.error('Error:', err.message);
  }
}

testWebhook();
