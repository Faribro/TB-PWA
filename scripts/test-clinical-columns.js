/**
 * Direct Supabase test to verify clinical columns exist and can be written
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

const TEST_PATIENT_ID = 'b1a63138-d973-4fe9-b7bc-075b2bc5a1fa';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testClinicalColumns() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 CLINICAL COLUMNS TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('Patient ID:', TEST_PATIENT_ID);
  console.log('');

  try {
    // Step 1: Fetch current patient data
    console.log('📋 STEP 1: Fetch current patient data');
    const { data: currentPatient, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', TEST_PATIENT_ID)
      .single();

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      return;
    }

    console.log('✅ Patient found');
    console.log('  Name:', currentPatient.inmate_name);
    console.log('  Total fields:', Object.keys(currentPatient).length);
    console.log('');

    // Step 2: Check which clinical columns exist
    console.log('📊 STEP 2: Check clinical columns');
    const clinicalColumns = [
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

    const existingColumns = [];
    const missingColumns = [];

    clinicalColumns.forEach(col => {
      if (col in currentPatient) {
        existingColumns.push(col);
        console.log(`  ✅ ${col}: ${currentPatient[col] === null ? 'null' : `"${currentPatient[col]}"`}`);
      } else {
        missingColumns.push(col);
        console.log(`  ❌ ${col}: COLUMN DOES NOT EXIST`);
      }
    });

    console.log('');
    console.log(`Summary: ${existingColumns.length}/${clinicalColumns.length} columns exist`);
    
    if (missingColumns.length > 0) {
      console.log('');
      console.log('❌ MISSING COLUMNS:');
      missingColumns.forEach(col => console.log(`  - ${col}`));
      console.log('');
      console.log('⚠️  These columns need to be added to the database schema');
      return;
    }

    // Step 3: Test write operation
    console.log('');
    console.log('✏️  STEP 3: Test write operation');
    const testUpdates = {
      referral_date: '2026-05-21',
      referred_facility: 'DMC-Designated microscopy centre',
      tb_diagnosed: 'Y',
      tb_diagnosis_date: '2026-05-20',
      tb_type: 'Pulmonary',
      att_start_date: '2026-05-22',
      hiv_status: 'Negative',
      art_status: 'Pre ART',
      nikshay_abha_id: 'TEST_' + Date.now(),
      remarks: 'Test update from script'
    };

    console.log('Updating with:', JSON.stringify(testUpdates, null, 2));
    console.log('');

    const { error: updateError } = await supabase
      .from('patients')
      .update(testUpdates)
      .eq('id', TEST_PATIENT_ID);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return;
    }

    console.log('✅ Update successful');
    console.log('');

    // Step 4: Verify write by reading back
    console.log('🔍 STEP 4: Verify data persistence');
    const { data: updatedPatient, error: verifyError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', TEST_PATIENT_ID)
      .single();

    if (verifyError) {
      console.error('❌ Verify error:', verifyError);
      return;
    }

    console.log('Verification results:');
    let allMatch = true;
    Object.entries(testUpdates).forEach(([key, sentValue]) => {
      const receivedValue = updatedPatient[key];
      const match = receivedValue === sentValue;
      
      if (match) {
        console.log(`  ✅ ${key}: "${receivedValue}"`);
      } else {
        console.log(`  ❌ ${key}: sent="${sentValue}" got="${receivedValue}"`);
        allMatch = false;
      }
    });

    console.log('');
    if (allMatch) {
      console.log('✅ ALL FIELDS PERSISTED CORRECTLY');
    } else {
      console.log('❌ SOME FIELDS DID NOT PERSIST');
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

testClinicalColumns();
