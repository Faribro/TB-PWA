/**
 * CHECK SUPABASE DATA PERSISTENCE
 * 
 * This script checks:
 * 1. Which table is being updated (patients vs sync_queue)
 * 2. Whether the data persists in the patients table
 * 3. What the actual stored values are
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDataPersistence() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 CHECKING SUPABASE DATA PERSISTENCE');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Find the test patient by unique_id
  const UNIQUE_ID = 'UKNACJ75754';
  const PATIENT_NAME = 'Test';

  console.log(`📋 Looking for patient: ${PATIENT_NAME} (${UNIQUE_ID})\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Check patients table
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📊 STEP 1: Checking patients table...\n');

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('unique_id', UNIQUE_ID)
    .single();

  if (patientError) {
    console.error('❌ Error fetching patient:', patientError);
    return;
  }

  if (!patient) {
    console.error('❌ Patient not found in patients table');
    return;
  }

  console.log('✅ Patient found in patients table:');
  console.log(`   ID: ${patient.id}`);
  console.log(`   Name: ${patient.inmate_name}`);
  console.log(`   Unique ID: ${patient.unique_id}`);
  console.log(`   Kobo UUID: ${patient.kobo_uuid}`);
  console.log('\n📋 Clinical Fields:');
  console.log(`   referral_date: ${patient.referral_date || '(empty)'}`);
  console.log(`   referred_facility: ${patient.referred_facility || '(empty)'}`);
  console.log(`   tb_diagnosed: ${patient.tb_diagnosed || '(empty)'}`);
  console.log(`   tb_diagnosis_date: ${patient.tb_diagnosis_date || '(empty)'}`);
  console.log(`   tb_type: ${patient.tb_type || '(empty)'}`);
  console.log(`   att_start_date: ${patient.att_start_date || '(empty)'}`);
  console.log(`   att_completion_date: ${patient.att_completion_date || '(empty)'}`);
  console.log(`   hiv_status: ${patient.hiv_status || '(empty)'}`);
  console.log(`   art_status: ${patient.art_status || '(empty)'}`);
  console.log(`   art_number: ${patient.art_number || '(empty)'}`);
  console.log(`   nikshay_abha_id: ${patient.nikshay_abha_id || '(empty)'}`);
  console.log(`   registration_date: ${patient.registration_date || '(empty)'}`);
  console.log(`   remarks: ${patient.remarks || '(empty)'}`);
  console.log('\n📋 Timestamps:');
  console.log(`   created_at: ${patient.created_at}`);
  console.log(`   updated_at: ${patient.updated_at}`);
  console.log(`   sheets_synced_at: ${patient.sheets_synced_at || '(empty)'}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Check sync_queue for recent updates
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\n📊 STEP 2: Checking sync_queue for recent updates...\n');

  const { data: queueEntries, error: queueError } = await supabase
    .from('sync_queue')
    .select('*')
    .eq('patient_id', patient.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (queueError) {
    console.error('❌ Error fetching sync_queue:', queueError);
  } else if (queueEntries && queueEntries.length > 0) {
    console.log(`✅ Found ${queueEntries.length} sync queue entries:\n`);
    queueEntries.forEach((entry, idx) => {
      console.log(`${idx + 1}. Queue Entry (${entry.status})`);
      console.log(`   Operation: ${entry.operation}`);
      console.log(`   Created: ${entry.created_at}`);
      console.log(`   Completed: ${entry.completed_at || '(pending)'}`);
      console.log(`   Retry Count: ${entry.retry_count}`);
      
      if (entry.payload) {
        const clinicalFields = [
          'referral_date',
          'referred_facility',
          'tb_diagnosed',
          'tb_diagnosis_date',
          'hiv_status',
          'att_start_date'
        ];
        
        const hasClinical = clinicalFields.some(field => entry.payload[field] !== undefined);
        
        if (hasClinical) {
          console.log('   Clinical fields in payload:');
          clinicalFields.forEach(field => {
            if (entry.payload[field] !== undefined) {
              console.log(`     - ${field}: ${entry.payload[field]}`);
            }
          });
        }
      }
      
      if (entry.last_error) {
        console.log(`   ❌ Error: ${entry.last_error}`);
      }
      console.log('');
    });
  } else {
    console.log('⚪ No sync queue entries found for this patient');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Simulate what the API returns
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📊 STEP 3: Simulating API response...\n');

  const { data: apiPatient, error: apiError } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patient.id)
    .single();

  if (apiError) {
    console.error('❌ Error fetching via API simulation:', apiError);
  } else {
    console.log('✅ API would return:');
    console.log(`   updated_at: ${apiPatient.updated_at}`);
    console.log(`   referred_facility: ${apiPatient.referred_facility || '(empty)'}`);
    console.log(`   tb_diagnosed: ${apiPatient.tb_diagnosed || '(empty)'}`);
    console.log(`   hiv_status: ${apiPatient.hiv_status || '(empty)'}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Check what BULK_COLUMNS would return
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\n📊 STEP 4: Checking BULK_COLUMNS response...\n');

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
    .eq('id', patient.id)
    .single();

  if (bulkError) {
    console.error('❌ Error fetching with BULK_COLUMNS:', bulkError);
  } else {
    console.log('✅ BULK_COLUMNS would return:');
    console.log(`   updated_at: ${bulkPatient.updated_at}`);
    console.log(`   referred_facility: ${bulkPatient.referred_facility || '(empty)'}`);
    console.log(`   tb_diagnosed: ${bulkPatient.tb_diagnosed || '(empty)'}`);
    console.log(`   hiv_status: ${bulkPatient.hiv_status || '(empty)'}`);
    
    // Check if any clinical fields are missing
    const allFields = Object.keys(patient);
    const bulkFields = Object.keys(bulkPatient);
    const missingFields = allFields.filter(f => !bulkFields.includes(f));
    
    if (missingFields.length > 0) {
      console.log('\n⚠️  Fields missing from BULK_COLUMNS:');
      missingFields.forEach(field => {
        const value = patient[field];
        if (value !== null && value !== undefined && value !== '') {
          console.log(`   - ${field}: ${value}`);
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Summary
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const hasClinicalData = !!(
    patient.referral_date ||
    patient.referred_facility ||
    patient.tb_diagnosed ||
    patient.hiv_status ||
    patient.att_start_date
  );

  if (hasClinicalData) {
    console.log('✅ Patient HAS clinical data in patients table');
    console.log('✅ Data is persisted correctly');
    console.log('✅ BULK_COLUMNS includes updated_at');
    console.log('\n🔍 If drawer shows empty data, the issue is:');
    console.log('   1. Parent component not passing updated patient');
    console.log('   2. Drawer preserving stale local state');
    console.log('   3. SWR cache not refreshing after save');
  } else {
    console.log('❌ Patient has NO clinical data in patients table');
    console.log('⚠️  Data is NOT being persisted');
    console.log('\n🔍 Possible causes:');
    console.log('   1. API is writing to wrong table');
    console.log('   2. API is failing silently');
    console.log('   3. Updates are being queued but not processed');
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════\n');
}

checkDataPersistence().catch(console.error);
