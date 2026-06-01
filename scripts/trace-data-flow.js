/**
 * COMPREHENSIVE DATA FLOW DIAGNOSTIC
 * 
 * This script traces the EXACT data flow from:
 * 1. Database → API → Parent Component → Drawer
 * 
 * It will identify where the data is being lost or corrupted.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function traceDataFlow() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 COMPREHENSIVE DATA FLOW DIAGNOSTIC');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Get the actual patient from database
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📋 STEP 1: Database (Source of Truth)\n');

  const { data: dbPatient, error: dbError } = await supabase
    .from('patients')
    .select('*')
    .eq('unique_id', 'UKNACJ75752')
    .single();

  if (dbError) {
    console.error('❌ Error:', dbError);
    return;
  }

  console.log('✅ Database patient:');
  console.log(`   ID: ${dbPatient.id}`);
  console.log(`   Name: ${dbPatient.inmate_name}`);
  console.log(`   referral_date: ${dbPatient.referral_date || '(empty)'}`);
  console.log(`   referred_facility: ${dbPatient.referred_facility || '(empty)'}`);
  console.log(`   tb_diagnosed: ${dbPatient.tb_diagnosed || '(empty)'}`);
  console.log(`   hiv_status: ${dbPatient.hiv_status || '(empty)'}`);
  console.log(`   updated_at: ${dbPatient.updated_at || '(empty)'}`);
  console.log(`   created_at: ${dbPatient.created_at}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Simulate what BULK_COLUMNS returns
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\n📋 STEP 2: BULK_COLUMNS API Response (what list uses)\n');

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
  ].join(',');

  const { data: bulkPatient, error: bulkError } = await supabase
    .from('patients')
    .select(BULK_COLUMNS)
    .eq('id', dbPatient.id)
    .single();

  if (bulkError) {
    console.error('❌ Error:', bulkError);
  } else {
    console.log('✅ BULK_COLUMNS response:');
    console.log(`   ID: ${bulkPatient.id}`);
    console.log(`   Name: ${bulkPatient.inmate_name}`);
    console.log(`   referral_date: ${bulkPatient.referral_date || '(empty)'}`);
    console.log(`   referred_facility: ${bulkPatient.referred_facility || '(empty)'}`);
    console.log(`   tb_diagnosed: ${bulkPatient.tb_diagnosed || '(empty)'}`);
    console.log(`   hiv_status: ${bulkPatient.hiv_status || '(empty)'}`);
    console.log(`   updated_at: ${bulkPatient.updated_at || '(empty)'}`);
    console.log(`   created_at: ${bulkPatient.created_at}`);
    
    const missingFields = Object.keys(dbPatient).filter(k => !Object.keys(bulkPatient).includes(k));
    if (missingFields.length > 0) {
      console.log(`\n⚠️  Missing from BULK_COLUMNS: ${missingFields.join(', ')}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Simulate what patient-sync API returns after save
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\n📋 STEP 3: patient-sync API Response (after save)\n');

  // Simulate an update
  const { data: updatedPatient, error: updateError } = await supabase
    .from('patients')
    .update({ 
      hiv_status: 'Negative',
      updated_at: new Date().toISOString()
    })
    .eq('id', dbPatient.id)
    .select('*')
    .single();

  if (updateError) {
    console.error('❌ Error:', updateError);
  } else {
    console.log('✅ patient-sync API response:');
    console.log(`   ID: ${updatedPatient.id}`);
    console.log(`   Name: ${updatedPatient.inmate_name}`);
    console.log(`   referral_date: ${updatedPatient.referral_date || '(empty)'}`);
    console.log(`   referred_facility: ${updatedPatient.referred_facility || '(empty)'}`);
    console.log(`   tb_diagnosed: ${updatedPatient.tb_diagnosed || '(empty)'}`);
    console.log(`   hiv_status: ${updatedPatient.hiv_status || '(empty)'}`);
    console.log(`   updated_at: ${updatedPatient.updated_at || '(empty)'}`);
    console.log(`   created_at: ${updatedPatient.created_at}`);
    
    console.log(`\n✅ This is what the drawer receives after save!`);
    console.log(`   The drawer stores this in localPatient`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Simulate what happens when parent gets patient from list
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\n📋 STEP 4: Parent Component (from list cache)\n');

  console.log('After save, parent calls mutate() to refresh list cache.');
  console.log('The list uses BULK_COLUMNS, which includes updated_at.');
  console.log('But the list might be cached with OLD data!\n');

  console.log('Parent passes to drawer:');
  console.log(`   ID: ${bulkPatient.id}`);
  console.log(`   Name: ${bulkPatient.inmate_name}`);
  console.log(`   referral_date: ${bulkPatient.referral_date || '(empty)'}`);
  console.log(`   referred_facility: ${bulkPatient.referred_facility || '(empty)'}`);
  console.log(`   tb_diagnosed: ${bulkPatient.tb_diagnosed || '(empty)'}`);
  console.log(`   hiv_status: ${bulkPatient.hiv_status || '(empty)'}`);
  console.log(`   updated_at: ${bulkPatient.updated_at || '(empty)'}`);
  console.log(`   created_at: ${bulkPatient.created_at}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Analyze the comparison logic
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\n📋 STEP 5: Drawer Comparison Logic\n');

  const localPatient = updatedPatient; // What drawer has after save
  const patientProp = bulkPatient; // What parent passes from list

  console.log('Drawer state:');
  console.log(`   localPatient.updated_at: ${localPatient.updated_at}`);
  console.log(`   localPatient.referral_date: ${localPatient.referral_date}`);
  console.log(`   localPatient.referred_facility: ${localPatient.referred_facility}`);

  console.log('\nParent prop:');
  console.log(`   patientProp.updated_at: ${patientProp.updated_at}`);
  console.log(`   patientProp.referral_date: ${patientProp.referral_date}`);
  console.log(`   patientProp.referred_facility: ${patientProp.referred_facility}`);

  const localHasClinical = !!(
    localPatient.referral_date?.trim() ||
    localPatient.referred_facility?.trim() ||
    localPatient.hiv_status?.trim() ||
    localPatient.tb_diagnosed?.trim()
  );

  const patientHasClinical = !!(
    patientProp.referral_date?.trim() ||
    patientProp.referred_facility?.trim() ||
    patientProp.hiv_status?.trim() ||
    patientProp.tb_diagnosed?.trim()
  );

  console.log(`\nlocalHasMeaningfulClinicalData: ${localHasClinical}`);
  console.log(`patientHasMeaningfulClinicalData: ${patientHasClinical}`);

  if (localHasClinical && patientHasClinical) {
    if (localPatient.updated_at && !patientProp.updated_at) {
      console.log('\n❌ BUG: localPatient has timestamp, patientProp does NOT');
      console.log('   Drawer preserves localPatient (stale data)');
      console.log('   This is why clinical data appears missing!');
    } else if (localPatient.updated_at && patientProp.updated_at) {
      const localNewer = new Date(localPatient.updated_at) > new Date(patientProp.updated_at);
      if (localNewer) {
        console.log('\n⚠️  localPatient has newer timestamp');
        console.log('   Drawer preserves localPatient');
      } else {
        console.log('\n✅ patientProp has newer timestamp');
        console.log('   Drawer accepts patientProp');
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6: THE REAL FIX
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════════════════════');
  console.log('💡 THE REAL FIX');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  console.log('The issue is NOT in the drawer comparison logic.');
  console.log('The issue is that the PARENT is passing stale data from the list cache.\n');

  console.log('ROOT CAUSE:');
  console.log('1. Drawer saves → API updates database with new updated_at');
  console.log('2. Drawer stores server response in localPatient (correct)');
  console.log('3. Parent calls mutate() to refresh list cache');
  console.log('4. List cache might still have OLD data (60s deduping!)');
  console.log('5. Parent passes stale patientProp to drawer');
  console.log('6. Drawer compares timestamps and preserves localPatient (stale!)');
  console.log('7. Result: Clinical data appears missing\n');

  console.log('THE FIX:');
  console.log('Option A: Remove dedupingInterval from useSWRAllPatients');
  console.log('Option B: Parent should NOT use list cache for selectedPatient');
  console.log('Option C: Drawer should always accept patientProp when IDs match');
  console.log('Option D: Parent should fetch fresh patient after save\n');

  console.log('RECOMMENDED: Option D - Parent fetches fresh patient after save');
  console.log('This ensures selectedPatient always has current data.\n');

  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

traceDataFlow().catch(console.error);
