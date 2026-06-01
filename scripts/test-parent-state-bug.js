/**
 * FOCUSED INVESTIGATION: Parent State Update Bug
 * 
 * Test the exact scenario:
 * 1. User opens drawer
 * 2. User fills clinical data
 * 3. User saves
 * 4. User closes drawer
 * 5. User reopens drawer
 * 6. Clinical data is missing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testScenario() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 TESTING: Parent State Update Bug');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Find a patient with clinical data
  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .not('referral_date', 'is', null)
    .limit(1)
    .single();

  if (error || !patient) {
    console.error('❌ No patient found with clinical data');
    return;
  }

  console.log('📋 STEP 1: Initial patient state (from database)\n');
  console.log(`Patient: ${patient.inmate_name}`);
  console.log(`ID: ${patient.id}`);
  console.log('\nClinical Fields:');
  console.log(`  referral_date: ${patient.referral_date}`);
  console.log(`  referred_facility: ${patient.referred_facility}`);
  console.log(`  tb_diagnosed: ${patient.tb_diagnosed}`);
  console.log(`  tb_diagnosis_date: ${patient.tb_diagnosis_date}`);
  console.log(`  hiv_status: ${patient.hiv_status}`);
  console.log(`  att_start_date: ${patient.att_start_date}`);
  console.log(`  updated_at: ${patient.updated_at}`);

  // Simulate what CommandCenter.updatePatient does (THE BUG)
  console.log('\n\n📋 STEP 2: Simulating CommandCenter.updatePatient (BUGGY VERSION)\n');
  
  const updates = {
    hiv_status: 'Positive' // User only updates HIV status
  };
  
  console.log('Updates sent to API:', updates);
  
  // This is what the BUGGY code does:
  const buggySelectedPatient = { ...patient, ...updates };
  
  console.log('\nBuggy selectedPatient after merge:');
  console.log(`  referral_date: ${buggySelectedPatient.referral_date}`);
  console.log(`  referred_facility: ${buggySelectedPatient.referred_facility}`);
  console.log(`  tb_diagnosed: ${buggySelectedPatient.tb_diagnosed}`);
  console.log(`  hiv_status: ${buggySelectedPatient.hiv_status} ← UPDATED`);
  console.log(`  att_start_date: ${buggySelectedPatient.att_start_date}`);
  
  // Now simulate what the API actually returns
  console.log('\n\n📋 STEP 3: What the API actually returns\n');
  
  const { data: serverPatient, error: updateError } = await supabase
    .from('patients')
    .update({ hiv_status: 'Positive', updated_at: new Date().toISOString() })
    .eq('id', patient.id)
    .select('*')
    .single();

  if (updateError) {
    console.error('❌ Update error:', updateError);
    return;
  }

  console.log('Server-confirmed patient:');
  console.log(`  referral_date: ${serverPatient.referral_date}`);
  console.log(`  referred_facility: ${serverPatient.referred_facility}`);
  console.log(`  tb_diagnosed: ${serverPatient.tb_diagnosed}`);
  console.log(`  hiv_status: ${serverPatient.hiv_status}`);
  console.log(`  att_start_date: ${serverPatient.att_start_date}`);
  console.log(`  updated_at: ${serverPatient.updated_at} ← NEW TIMESTAMP`);

  // Compare
  console.log('\n\n📋 STEP 4: Comparison\n');
  
  const allFields = Object.keys(serverPatient);
  const missingInBuggy = allFields.filter(field => {
    const serverValue = serverPatient[field];
    const buggyValue = buggySelectedPatient[field];
    return serverValue !== buggyValue && serverValue !== null && serverValue !== undefined;
  });

  if (missingInBuggy.length > 0) {
    console.log('⚠️  Fields that differ between buggy merge and server response:');
    missingInBuggy.forEach(field => {
      console.log(`  - ${field}:`);
      console.log(`      Buggy: ${buggySelectedPatient[field]}`);
      console.log(`      Server: ${serverPatient[field]}`);
    });
  } else {
    console.log('✅ No differences found (in this specific case)');
  }

  // The REAL bug: What if the list API doesn't return all fields?
  console.log('\n\n📋 STEP 5: Simulating list API response (BULK_COLUMNS)\n');
  
  const BULK_COLUMNS = [
    'id', 'unique_id', 'kobo_uuid', 'inmate_name', 'father_husband_name',
    'date_of_birth', 'age', 'sex', 'contact_number', 'address', 'inmate_type',
    'screening_date', 'submitted_on', 'screening_state', 'screening_district',
    'facility_name', 'facility_type', 'staff_name',
    'symptoms_10s', 'tb_past_history', 'xray_result',
    'referral_date', 'referred_facility',
    'tb_diagnosed', 'tb_diagnosis_date', 'tb_type',
    'att_start_date', 'att_completion_date',
    'hiv_status', 'art_status', 'art_number',
    'nikshay_abha_id', 'registration_date', 'closure_reason', 'remarks',
    'ai_link_status', 'created_at', 'updated_at'
  ];

  const listPatient = {};
  BULK_COLUMNS.forEach(col => {
    listPatient[col] = serverPatient[col];
  });

  console.log('List API patient (BULK_COLUMNS only):');
  console.log(`  referral_date: ${listPatient.referral_date}`);
  console.log(`  referred_facility: ${listPatient.referred_facility}`);
  console.log(`  tb_diagnosed: ${listPatient.tb_diagnosed}`);
  console.log(`  hiv_status: ${listPatient.hiv_status}`);
  console.log(`  att_start_date: ${listPatient.att_start_date}`);

  const missingFromList = allFields.filter(field => {
    const serverValue = serverPatient[field];
    const listValue = listPatient[field];
    return serverValue !== listValue && serverValue !== null && serverValue !== undefined && serverValue !== '';
  });

  if (missingFromList.length > 0) {
    console.log('\n⚠️  Fields missing from list API:');
    missingFromList.forEach(field => {
      console.log(`  - ${field}: ${serverPatient[field]}`);
    });
  }

  // Revert the test update
  console.log('\n\n🔄 Reverting test update...');
  await supabase
    .from('patients')
    .update({ hiv_status: patient.hiv_status, updated_at: patient.updated_at })
    .eq('id', patient.id);
  console.log('✅ Reverted');

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

testScenario().catch(console.error);
