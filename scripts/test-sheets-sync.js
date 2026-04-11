#!/usr/bin/env node

const WEBHOOK_SECRET = 'samadhaan_sheets_sync_secure_2026';
const API_URL = 'http://localhost:3000/api/sync-to-sheets';

const samplePayload = {
  type: 'INSERT',
  table: 'patients',
  record: {
    id: 'test-' + Date.now(),
    staff_name: 'Dr. Test Kumar',
    submitted_on: new Date().toISOString(),
    screening_state: 'Maharashtra',
    screening_district: 'Mumbai',
    facility_name: 'Test Central Jail',
    facility_type: 'Central Jail',
    screening_date: '2025-01-20',
    unique_id: 'TEST-' + Date.now(),
    inmate_name: 'Test Patient',
    inmate_type: 'Undertrial',
    father_husband_name: 'Test Father',
    date_of_birth: '1990-01-01',
    age: 35,
    sex: 'Male',
    contact_number: '9876543210',
    address: 'Test Address, Mumbai',
    xray_result: 'Abnormal',
    symptoms_10s: 'Yes',
    tb_past_history: 'No',
    referral_date: '2025-01-21',
    referred_facility: 'Test TB Hospital',
    tb_diagnosed: 'Y',
    tb_diagnosis_date: '2025-01-22',
    tb_type: 'P',
    att_start_date: '2025-01-23',
    att_completion_date: null,
    hiv_status: 'Negative',
    art_status: null,
    art_number: null,
    nikshay_abha_id: 'TEST123456',
    registration_date: '2025-01-20',
    remarks: 'Test patient for webhook',
    kobo_uuid: 'test-uuid-' + Date.now(),
    kobo_id: 'TEST-KOBO-123',
    serial_number: 'SN-' + Date.now(),
    synced_to_sheets: false,
    sheets_sync_attempts: 0,
    sheets_sync_error: null
  }
};

async function testWebhook() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 TESTING SYNC-TO-SHEETS WEBHOOK');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  console.log('📋 Test Payload:');
  console.log(JSON.stringify(samplePayload, null, 2));
  console.log('\n🔄 Sending POST request to:', API_URL);
  console.log('🔐 Using webhook secret:', WEBHOOK_SECRET);
  console.log('');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET
      },
      body: JSON.stringify(samplePayload)
    });

    const data = await response.json();

    console.log('📊 Response Status:', response.status);
    console.log('📦 Response Body:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    if (response.ok) {
      console.log('✅ TEST PASSED - Webhook processed successfully');
    } else {
      console.log('❌ TEST FAILED - Webhook returned error');
    }

  } catch (error) {
    console.error('❌ TEST FAILED - Network error:', error.message);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
}

testWebhook();
