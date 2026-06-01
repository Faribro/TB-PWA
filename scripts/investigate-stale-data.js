/**
 * INVESTIGATION SCRIPT: Stale Clinical Data Bug
 * 
 * This script investigates the actual data structure in Supabase to understand:
 * 1. What fields exist in the patients table
 * 2. What payloads are stored in sync_queue
 * 3. Whether other_facility_name exists and has data
 * 4. What the API actually returns vs what's in the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigate() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 INVESTIGATING STALE CLINICAL DATA BUG');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Check patients table schema
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📋 STEP 1: Checking patients table schema...\n');
  
  const { data: schemaData, error: schemaError } = await supabase
    .from('patients')
    .select('*')
    .limit(1);

  if (schemaError) {
    console.error('❌ Error fetching schema:', schemaError);
  } else if (schemaData && schemaData.length > 0) {
    const columns = Object.keys(schemaData[0]);
    console.log(`✅ Found ${columns.length} columns in patients table:\n`);
    
    // Group columns by category
    const clinicalFields = columns.filter(c => 
      c.includes('referral') || 
      c.includes('facility') || 
      c.includes('tb_') || 
      c.includes('hiv') || 
      c.includes('art') || 
      c.includes('att_') ||
      c.includes('nikshay') ||
      c.includes('abha')
    );
    
    console.log('🏥 Clinical Fields:');
    clinicalFields.forEach(field => {
      const value = schemaData[0][field];
      const hasData = value !== null && value !== undefined && value !== '';
      console.log(`  ${hasData ? '✅' : '⚪'} ${field}: ${hasData ? `"${value}"` : '(empty)'}`);
    });
    
    console.log('\n📊 All Columns:');
    columns.forEach(col => console.log(`  - ${col}`));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Check if other_facility_name exists and has data
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\n📋 STEP 2: Checking other_facility_name field...\n');
  
  const { data: facilityData, error: facilityError } = await supabase
    .from('patients')
    .select('id, inmate_name, referred_facility, other_facility_name')
    .not('referred_facility', 'is', null)
    .limit(10);

  if (facilityError) {
    console.error('❌ Error fetching facility data:', facilityError);
  } else {
    console.log(`✅ Found ${facilityData.length} patients with referral data:\n`);
    facilityData.forEach((patient, idx) => {
      console.log(`${idx + 1}. ${patient.inmate_name || 'Unknown'}`);
      console.log(`   referred_facility: ${patient.referred_facility || '(empty)'}`);
      console.log(`   other_facility_name: ${patient.other_facility_name || '(empty)'}`);
      console.log('');
    });
    
    const withOtherFacility = facilityData.filter(p => p.other_facility_name);
    console.log(`📊 Summary: ${withOtherFacility.length}/${facilityData.length} patients have other_facility_name populated\n`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Check sync_queue payloads
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📋 STEP 3: Checking sync_queue payloads...\n');
  
  const { data: queueData, error: queueError } = await supabase
    .from('sync_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (queueError) {
    console.error('❌ Error fetching sync_queue:', queueError);
  } else {
    console.log(`✅ Found ${queueData.length} recent sync queue entries:\n`);
    queueData.forEach((entry, idx) => {
      console.log(`${idx + 1}. Queue Entry (${entry.status})`);
      console.log(`   Operation: ${entry.operation}`);
      console.log(`   Created: ${entry.created_at}`);
      console.log(`   Retry Count: ${entry.retry_count}`);
      
      if (entry.payload) {
        const payload = entry.payload;
        console.log(`   Payload Keys: ${Object.keys(payload).join(', ')}`);
        
        // Check for clinical fields in payload
        const clinicalInPayload = [
          'referral_date',
          'referred_facility', 
          'other_facility_name',
          'tb_diagnosed',
          'hiv_status',
          'att_start_date'
        ].filter(field => payload[field] !== undefined);
        
        if (clinicalInPayload.length > 0) {
          console.log(`   Clinical Fields in Payload:`);
          clinicalInPayload.forEach(field => {
            console.log(`     - ${field}: ${payload[field]}`);
          });
        }
      }
      
      if (entry.last_error) {
        console.log(`   ❌ Last Error: ${entry.last_error}`);
      }
      console.log('');
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Compare API response vs direct DB query
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📋 STEP 4: Comparing API columns vs DB columns...\n');
  
  // Simulate what the bulk API returns
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

  const { data: fullPatient, error: fullError } = await supabase
    .from('patients')
    .select('*')
    .not('referred_facility', 'is', null)
    .limit(1)
    .single();

  if (fullError) {
    console.error('❌ Error fetching full patient:', fullError);
  } else if (fullPatient) {
    const allColumns = Object.keys(fullPatient);
    const missingFromBulk = allColumns.filter(col => !BULK_COLUMNS.includes(col));
    
    console.log('🔍 Columns in DB but NOT in BULK_COLUMNS:');
    missingFromBulk.forEach(col => {
      const hasData = fullPatient[col] !== null && fullPatient[col] !== undefined && fullPatient[col] !== '';
      console.log(`  ${hasData ? '⚠️' : '⚪'} ${col}${hasData ? ` (HAS DATA: "${fullPatient[col]}")` : ' (empty)'}`);
    });
    
    console.log('\n✅ Columns in BULK_COLUMNS:');
    BULK_COLUMNS.forEach(col => {
      const exists = allColumns.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Test a real update scenario
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\n📋 STEP 5: Testing update scenario...\n');
  
  const { data: testPatient, error: testError } = await supabase
    .from('patients')
    .select('id, inmate_name, referred_facility, other_facility_name, updated_at')
    .not('referred_facility', 'is', null)
    .limit(1)
    .single();

  if (testError) {
    console.error('❌ Error fetching test patient:', testError);
  } else if (testPatient) {
    console.log('📝 Test Patient BEFORE update:');
    console.log(`   ID: ${testPatient.id}`);
    console.log(`   Name: ${testPatient.inmate_name}`);
    console.log(`   referred_facility: ${testPatient.referred_facility}`);
    console.log(`   other_facility_name: ${testPatient.other_facility_name || '(empty)'}`);
    console.log(`   updated_at: ${testPatient.updated_at}`);
    
    // Simulate what happens when we update via API
    console.log('\n🔄 Simulating API update (only updating referred_facility)...');
    
    const { data: updatedPatient, error: updateError } = await supabase
      .from('patients')
      .update({ 
        referred_facility: 'CBNAAT',
        updated_at: new Date().toISOString()
      })
      .eq('id', testPatient.id)
      .select('id, inmate_name, referred_facility, other_facility_name, updated_at')
      .single();

    if (updateError) {
      console.error('❌ Update error:', updateError);
    } else {
      console.log('\n📝 Test Patient AFTER update:');
      console.log(`   ID: ${updatedPatient.id}`);
      console.log(`   Name: ${updatedPatient.inmate_name}`);
      console.log(`   referred_facility: ${updatedPatient.referred_facility}`);
      console.log(`   other_facility_name: ${updatedPatient.other_facility_name || '(empty)'}`);
      console.log(`   updated_at: ${updatedPatient.updated_at}`);
      
      if (testPatient.other_facility_name && !updatedPatient.other_facility_name) {
        console.log('\n❌ BUG CONFIRMED: other_facility_name was LOST during update!');
      } else if (testPatient.other_facility_name === updatedPatient.other_facility_name) {
        console.log('\n✅ other_facility_name preserved correctly');
      }
    }
    
    // Revert the test update
    console.log('\n🔄 Reverting test update...');
    await supabase
      .from('patients')
      .update({ 
        referred_facility: testPatient.referred_facility,
        updated_at: testPatient.updated_at
      })
      .eq('id', testPatient.id);
    console.log('✅ Test update reverted');
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ INVESTIGATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

investigate().catch(console.error);
