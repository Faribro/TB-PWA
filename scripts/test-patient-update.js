/**
 * Test script for patient update flow
 * Tests: Clinical save → DB persistence → API response → Cache update
 */

const TEST_PATIENT_ID = 'b1a63138-d973-4fe9-b7bc-075b2bc5a1fa';
const API_URL = 'http://localhost:3000/api/patient-sync';

const testPayload = {
  patientId: TEST_PATIENT_ID,
  updates: {
    id: TEST_PATIENT_ID,
    referral_date: '2026-05-10',
    referred_facility: 'DMC-Designated microscopy centre',
    tb_diagnosed: 'Y',
    tb_diagnosis_date: '2026-05-09',
    tb_type: 'Pulmonary',
    att_start_date: '2026-05-11',
    hiv_status: 'Negative',
    art_status: 'Pre ART',
    nikshay_abha_id: 'TEST123',
    updated_at: new Date().toISOString()
  }
};

async function testPatientUpdate() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 PATIENT UPDATE TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('Patient ID:', TEST_PATIENT_ID);
  console.log('Payload:', JSON.stringify(testPayload, null, 2));
  console.log('');

  try {
    console.log('📤 Sending update request...');
    const startTime = Date.now();
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log('');

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API ERROR:');
      console.error('  Status:', response.status, response.statusText);
      console.error('  Error:', JSON.stringify(errorData, null, 2));
      return;
    }

    const data = await response.json();
    console.log('✅ API SUCCESS');
    console.log('  Success:', data.success);
    console.log('  Duration:', data._perf?.duration, 'ms');
    console.log('');

    // Verify response structure
    console.log('🔍 RESPONSE VERIFICATION:');
    console.log('  Has patient object:', !!data.patient);
    
    if (data.patient) {
      console.log('  Patient ID:', data.patient.id);
      console.log('  Kobo UUID:', data.patient.kobo_uuid);
      console.log('');
      
      console.log('📋 CLINICAL FIELDS IN RESPONSE:');
      const clinicalFields = [
        'referral_date',
        'referred_facility',
        'tb_diagnosed',
        'tb_diagnosis_date',
        'tb_type',
        'att_start_date',
        'att_completion_date',
        'hiv_status',
        'art_status',
        'art_number',
        'nikshay_abha_id',
        'registration_date',
        'remarks'
      ];

      let missingFields = [];
      let nullFields = [];
      let presentFields = [];

      clinicalFields.forEach(field => {
        const value = data.patient[field];
        const sentValue = testPayload.updates[field];
        
        if (value === undefined) {
          missingFields.push(field);
        } else if (value === null && sentValue !== null && sentValue !== undefined) {
          nullFields.push(field);
        } else if (value !== null && value !== undefined) {
          presentFields.push(field);
          console.log(`  ✅ ${field}: "${value}"`);
        }
      });

      console.log('');
      console.log('📊 FIELD SUMMARY:');
      console.log(`  ✅ Present: ${presentFields.length}`);
      console.log(`  ⚠️  Null: ${nullFields.length}`);
      console.log(`  ❌ Missing: ${missingFields.length}`);

      if (nullFields.length > 0) {
        console.log('');
        console.log('⚠️  NULL FIELDS (sent but returned null):');
        nullFields.forEach(field => {
          console.log(`  - ${field}: sent="${testPayload.updates[field]}" got=null`);
        });
      }

      if (missingFields.length > 0) {
        console.log('');
        console.log('❌ MISSING FIELDS (not in response):');
        missingFields.forEach(field => console.log(`  - ${field}`));
      }

      // Verify data integrity
      console.log('');
      console.log('🔐 DATA INTEGRITY CHECK:');
      let integrityPass = true;

      Object.entries(testPayload.updates).forEach(([key, sentValue]) => {
        if (key === 'id' || key === 'updated_at') return;
        
        const receivedValue = data.patient[key];
        
        if (sentValue !== null && sentValue !== undefined) {
          if (receivedValue === null || receivedValue === undefined) {
            console.log(`  ❌ ${key}: sent="${sentValue}" but got="${receivedValue}"`);
            integrityPass = false;
          } else if (receivedValue === sentValue) {
            console.log(`  ✅ ${key}: matches`);
          } else {
            console.log(`  ⚠️  ${key}: sent="${sentValue}" got="${receivedValue}"`);
          }
        }
      });

      console.log('');
      if (integrityPass) {
        console.log('✅ DATA INTEGRITY: PASS');
      } else {
        console.log('❌ DATA INTEGRITY: FAIL - Some fields were lost');
      }
    } else {
      console.log('❌ No patient object in response');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED:');
    console.error('  Error:', error.message);
    console.error('  Stack:', error.stack);
  }
}

// Run test
testPatientUpdate();
