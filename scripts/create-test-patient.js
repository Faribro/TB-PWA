// ═══════════════════════════════════════════════════════════════════════════
// CREATE TEST PATIENT WITH COMPLETE DEMOGRAPHIC DATA
// ═══════════════════════════════════════════════════════════════════════════
// Creates a new patient with all 19 demographic fields populated
// Run: node scripts/create-test-patient.js

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function createTestPatient() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🆕 CREATE TEST PATIENT - Complete Demographic Data (19 Fields)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('📋 Configuration:');
  console.log('  Supabase URL:', supabaseUrl);
  console.log('');
  
  // Complete test patient data - all 19 demographic fields
  const testPatient = {
    kobo_uuid: 'TEST-REAL-DATA-001',
    
    // 1-7: Screening Details
    staff_name: 'Dr. Rajesh Kumar',
    submitted_on: '2026-05-04',
    screening_state: 'Maharashtra',
    screening_district: 'Nagpur',
    facility_name: 'Central Jail Nagpur',
    facility_type: 'Prison',
    screening_date: '2026-05-04',
    
    // 8-16: Identity & Demographics
    unique_id: 'TEST-CJ-NGP-001',
    inmate_name: 'Ramesh Patil',
    inmate_type: 'Convicted',
    father_husband_name: 'Shankar Patil',
    date_of_birth: '1985-03-15',
    age: 41,
    sex: 'Male',
    contact_number: '9876543210',
    address: 'Village Kamptee, Nagpur, Maharashtra',
    
    // 17-19: TB Screening
    xray_result: 'Suspected TB Case',
    symptoms_10s: 'Cough of any duration, Fever',
    tb_past_history: 'No',
    
    // System fields
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  console.log('📝 Creating patient with 19 demographic fields:');
  console.log('  [1] Name of the Staff:', testPatient.staff_name);
  console.log('  [2] Submitted On:', testPatient.submitted_on);
  console.log('  [3] State:', testPatient.screening_state);
  console.log('  [4] District:', testPatient.screening_district);
  console.log('  [5] Facility Name:', testPatient.facility_name);
  console.log('  [6] Facility type:', testPatient.facility_type);
  console.log('  [7] Date of Screening:', testPatient.screening_date);
  console.log('  [8] Unique ID:', testPatient.unique_id);
  console.log('  [9] Inmate Name:', testPatient.inmate_name);
  console.log('  [10] Inmate type:', testPatient.inmate_type);
  console.log('  [11] Father/Husband Name:', testPatient.father_husband_name);
  console.log('  [12] Date of Birth:', testPatient.date_of_birth);
  console.log('  [13] Age:', testPatient.age);
  console.log('  [14] Sex:', testPatient.sex);
  console.log('  [15] Contact Number:', testPatient.contact_number);
  console.log('  [16] Address:', testPatient.address);
  console.log('  [17] Chest X-ray Result:', testPatient.xray_result);
  console.log('  [18] 10s Symptoms:', testPatient.symptoms_10s);
  console.log('  [19] Past history of TB:', testPatient.tb_past_history);
  console.log('');
  
  try {
    // Check if patient already exists
    const { data: existing } = await supabase
      .from('patients')
      .select('id, kobo_uuid, inmate_name')
      .eq('kobo_uuid', testPatient.kobo_uuid)
      .single();
    
    if (existing) {
      console.log('⚠️  Patient already exists:');
      console.log('  ID:', existing.id);
      console.log('  Name:', existing.inmate_name);
      console.log('  KoboUUID:', existing.kobo_uuid);
      console.log('');
      console.log('✅ You can now update clinical fields for this patient');
      return;
    }
    
    // Insert new patient
    console.log('📤 Inserting patient into Supabase...');
    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert(testPatient)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Failed to create patient:', error.message);
      console.error('  Details:', error);
      return;
    }
    
    console.log('✅ Patient created successfully!');
    console.log('  ID:', newPatient.id);
    console.log('  KoboUUID:', newPatient.kobo_uuid);
    console.log('  Name:', newPatient.inmate_name);
    console.log('');
    
    // Trigger Google Sheets sync
    console.log('📤 Syncing to Google Sheets...');
    const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('⚠️  GOOGLE_SCRIPT_WEBHOOK_URL not configured - skipping sheets sync');
    } else {
      // CRITICAL FIX: Send in batch format
      const batchPayload = {
        batch: [newPatient],
        batch_id: `create-${Date.now()}`,
        count: 1
      };
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload),
      });
      
      if (response.ok || response.status === 302) {
        console.log('✅ Synced to Google Sheets');
      } else {
        console.warn('⚠️  Google Sheets sync failed:', response.status);
      }
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ PATIENT CREATED - Ready for Clinical Updates');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 VERIFICATION STEPS:');
    console.log('');
    console.log('1. Check Google Sheets "Patient Linelist_TB"');
    console.log('   - Find row with Unique ID: TEST-CJ-NGP-001');
    console.log('   - Verify all 19 demographic fields are populated');
    console.log('');
    console.log('2. Open the app and find patient: Ramesh Patil');
    console.log('   - Search by name or Unique ID: TEST-CJ-NGP-001');
    console.log('');
    console.log('3. Update clinical fields in the app:');
    console.log('   - Date of referral for TB Examination');
    console.log('   - Name of facility where referred to');
    console.log('   - TB diagnosed (Y/N)');
    console.log('   - Date of TB Diagnosed');
    console.log('   - Type of TB Diagnosed (P/EP)');
    console.log('   - Date of starting ATT');
    console.log('   - Date of Treatment Completion');
    console.log('   - HIV Status');
    console.log('   - ART Status');
    console.log('   - ART Number');
    console.log('   - NIKSHAY/ABHA ID');
    console.log('   - Date of registration');
    console.log('   - Remarks');
    console.log('');
    console.log('4. Verify clinical fields sync to Google Sheets');
    console.log('   - Check the same row in Google Sheets');
    console.log('   - All clinical columns should be populated');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('  Stack:', error.stack);
  }
}

// Run
createTestPatient().catch(console.error);
