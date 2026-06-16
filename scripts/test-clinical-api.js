// Test Script: Clinical API End-to-End Test
// Purpose: Verify clinical track data persistence and step indicators
// Usage: node scripts/test-clinical-api.js

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test patient data
const testPatientId = '75c0ebf5-2847-449a-8a48-8d90cb69f499'; // From logs
const clinicalTestData = {
  referral_date: '07/05/26',
  referred_facility: 'Test TB Center',
  tb_diagnosed: 'Y',
  tb_diagnosis_date: '07/05/26',
  tb_type: 'P',
  att_start_date: '07/05/2026',
  att_completion_date: '21/08/2026',
  hiv_status: 'Negative',
  art_status: 'N/A',
  art_number: '',
  nikshay_abha_id: '123456789012',
  registration_date: '07/05/2026',
  remarks: 'Test clinical data'
};

async function testClinicalAPI() {
  console.log('🏥 Clinical API Test Suite');
  console.log('========================\n');

  try {
    // Test 1: Check current patient fields
    console.log('📋 Test 1: Checking current patient fields...');
    const { data: currentPatient, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', testPatientId)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch patient:', fetchError);
      return;
    }

    console.log('✅ Current patient fields:', Object.keys(currentPatient).length);
    console.log('📊 Available fields:', Object.keys(currentPatient).join(', '));

    // Test 2: Update patient with clinical data
    console.log('\n📝 Test 2: Updating patient with clinical data...');
    const response = await fetch(`${API_BASE_URL}/api/patient-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId: testPatientId,
        updates: clinicalTestData
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ API update failed:', result);
      return;
    }

    console.log('✅ API update successful');
    console.log('📊 Response fields:', Object.keys(result.patient).length);
    console.log('🔄 Updated fields:', Object.keys(result.patient).join(', '));

    // Test 3: Verify clinical fields in response
    console.log('\n🔍 Test 3: Verifying clinical fields in response...');
    const expectedFields = [
      'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
      'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status',
      'art_status', 'art_number', 'nikshay_abha_id', 'registration_date', 'remarks'
    ];

    let missingFields = [];
    let presentFields = [];

    expectedFields.forEach(field => {
      if (result.patient[field] !== undefined) {
        presentFields.push(field);
      } else {
        missingFields.push(field);
      }
    });

    console.log(`✅ Present fields (${presentFields.length}):`, presentFields.join(', '));
    
    if (missingFields.length > 0) {
      console.log(`❌ Missing fields (${missingFields.length}):`, missingFields.join(', '));
    }

    // Test 4: Verify step indicator logic
    console.log('\n🚦 Test 4: Testing step indicator logic...');
    
    const stepChecks = {
      'Sputum & Referral': result.patient.referral_date && result.patient.referred_facility,
      'Diagnosis': result.patient.tb_diagnosed && result.patient.tb_diagnosis_date,
      'Treatment': result.patient.att_start_date,
      'HIV & ART': result.patient.hiv_status,
      'Nikshay': result.patient.nikshay_abha_id
    };

    Object.entries(stepChecks).forEach(([step, isComplete]) => {
      const status = isComplete ? '✅ GREEN' : '❌ GRAY';
      console.log(`  ${step}: ${status}`);
    });

    // Test 5: Verify database persistence
    console.log('\n💾 Test 5: Verifying database persistence...');
    const { data: verifyPatient, error: verifyError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', testPatientId)
      .single();

    if (verifyError) {
      console.error('❌ Failed to verify patient data:', verifyError);
      return;
    }

    let persistedFields = [];
    expectedFields.forEach(field => {
      if (verifyPatient[field] === clinicalTestData[field]) {
        persistedFields.push(field);
      }
    });

    console.log(`✅ Persisted fields (${persistedFields.length}):`, persistedFields.join(', '));

    // Summary
    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log(`✅ API Response: ${Object.keys(result.patient).length} fields`);
    console.log(`✅ Clinical Fields: ${presentFields.length}/${expectedFields.length} present`);
    console.log(`✅ Database Persistence: ${persistedFields.length}/${expectedFields.length} fields`);
    console.log(`✅ Step Indicators: ${Object.values(stepChecks).filter(Boolean).length}/5 complete`);

    if (presentFields.length === expectedFields.length && persistedFields.length === expectedFields.length) {
      console.log('\n🎉 ALL TESTS PASSED - Clinical workflow is working correctly!');
    } else {
      console.log('\n⚠️  Some tests failed - check the missing fields above');
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testClinicalAPI();
}

module.exports = { testClinicalAPI };
