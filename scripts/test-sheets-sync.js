// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE SHEETS SYNC TEST - Complete Patient Data
// ═══════════════════════════════════════════════════════════════════════════
// Tests that ALL clinical fields are synced to Google Sheets
// Run: node scripts/test-sheets-sync.js

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Test patient with ALL clinical fields populated
const testPatient = {
  kobo_uuid: '8ee307a8-cbc4-42cf-bd52-3f4c53edcb77',
  
  // Demographics
  inmate_name: 'Chaitu Wadde',
  age: 65,
  sex: 'Male',
  contact_number: '8788554035',
  address: 'Test Address, Maharashtra',
  father_husband_name: 'Test Father Name',
  date_of_birth: '1959-01-01',
  
  // Screening Details
  screening_date: '2026-04-05',
  screening_state: 'Maharashtra',
  screening_district: 'Mumbai',
  facility_name: 'Test Facility',
  facility_type: 'Prison',
  staff_name: 'Test Staff',
  submitted_on: '2026-04-05',
  unique_id: 'TEST-001',
  inmate_type: 'Convict',
  
  // TB Screening
  xray_result: 'Suspected TB Case',
  symptoms_10s: 'Yes',
  tb_past_history: 'No',
  
  // CLINICAL FIELDS - These should appear in Google Sheets
  referral_date: '2026-04-06',
  referred_facility: 'DMC-Designated microscopy centre',
  tb_diagnosed: 'Y',
  tb_diagnosis_date: '2026-04-10',
  tb_type: 'Pulmonary',
  att_start_date: '2026-04-12',
  att_completion_date: '2026-10-12',
  hiv_status: 'Negative',
  art_status: 'Pre ART',
  art_number: 'ART123456',
  nikshay_abha_id: 'NIKSHAY789',
  registration_date: '2026-04-11',
  remarks: 'Test patient - all fields populated',
};

async function testSheetsSync() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 GOOGLE SHEETS SYNC TEST - Complete Patient Data');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  
  console.log('📋 Test Patient Data:');
  console.log('  Name:', testPatient.inmate_name);
  console.log('  KoboUUID:', testPatient.kobo_uuid);
  console.log('  Age:', testPatient.age);
  console.log('  Contact:', testPatient.contact_number);
  console.log('\n🏥 Clinical Fields to Sync:');
  console.log('  Referral Date:', testPatient.referral_date);
  console.log('  Referred Facility:', testPatient.referred_facility);
  console.log('  TB Diagnosed:', testPatient.tb_diagnosed);
  console.log('  Diagnosis Date:', testPatient.tb_diagnosis_date);
  console.log('  TB Type:', testPatient.tb_type);
  console.log('  ATT Start:', testPatient.att_start_date);
  console.log('  ATT Completion:', testPatient.att_completion_date);
  console.log('  HIV Status:', testPatient.hiv_status);
  console.log('  ART Status:', testPatient.art_status);
  console.log('  ART Number:', testPatient.art_number);
  console.log('  NIKSHAY ID:', testPatient.nikshay_abha_id);
  console.log('  Registration Date:', testPatient.registration_date);
  console.log('  Remarks:', testPatient.remarks);
  console.log('\n');
  
  try {
    console.log('🔄 Sending update to /api/patient-sync...');
    const startTime = Date.now();
    
    const response = await fetch(`${BACKEND_URL}/api/patient-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        patientId: testPatient.kobo_uuid,
        updates: testPatient,
      }),
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    console.log(`\n📊 Response (${duration}ms):`);
    console.log('  Status:', response.status, response.statusText);
    console.log('  Success:', data.success);
    
    if (data.success) {
      console.log('\n✅ Supabase Update: SUCCESS');
      console.log('  Patient ID:', data.patient?.id);
      console.log('  Updated At:', data.patient?.updated_at);
      
      // Check if clinical fields are in response
      console.log('\n🔍 Clinical Fields in Response:');
      const clinicalFields = [
        'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
        'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status',
        'art_status', 'art_number', 'nikshay_abha_id', 'registration_date', 'remarks'
      ];
      
      clinicalFields.forEach(field => {
        const value = data.patient?.[field];
        const status = value ? '✅' : '❌';
        console.log(`  ${status} ${field}: "${value || 'missing'}"`);
      });
      
      console.log('\n⏳ Google Sheets Sync: QUEUED');
      console.log('  Check Google Sheets in 30-60 seconds');
      console.log('  Check Vercel logs for [ProcessSync] messages');
      
      console.log('\n📋 Expected in Google Sheets:');
      console.log('  Row should have ALL fields populated');
      console.log('  Look for KoboUUID:', testPatient.kobo_uuid);
      console.log('  Verify clinical columns are NOT empty');
      
    } else {
      console.log('\n❌ Update Failed:', data.error);
      console.log('  Details:', data.detail || 'No details');
    }
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error('  Stack:', error.stack);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🎯 Next Steps:');
  console.log('  1. Wait 30-60 seconds for sync to complete');
  console.log('  2. Check Google Sheets for row with KoboUUID:', testPatient.kobo_uuid);
  console.log('  3. Verify ALL clinical columns are populated (not empty)');
  console.log('  4. Check Vercel logs for [ProcessSync] and [QStash] messages');
  console.log('═══════════════════════════════════════════════════════════════════════════');
}

// Run test
testSheetsSync().catch(console.error);
