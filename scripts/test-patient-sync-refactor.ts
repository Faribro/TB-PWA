/**
 * Test Patient Sync API with Fire-and-Forget
 * 
 * Tests the /api/patient-sync endpoint to verify:
 * 1. Updates patient in Supabase
 * 2. Returns immediately without blocking
 * 3. No sync tracking fields in response
 * 4. Fire-and-forget Sheets sync happens in background
 */

const API_URL = 'http://localhost:3000/api/patient-sync';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🧪 TESTING PATIENT SYNC API WITH FIRE-AND-FORGET');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.log('💡 Add to .env.local and restart');
  process.exit(1);
}

async function testPatientSync() {
  // First, get a real patient ID from Supabase
  console.log('🔍 Fetching a test patient from Supabase...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const patientsResponse = await fetch(`${supabaseUrl}/rest/v1/patients?select=id,kobo_uuid,inmate_name&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });

  const patients = await patientsResponse.json();
  
  if (!patients || patients.length === 0) {
    console.error('❌ No patients found in database');
    console.log('💡 Run Kobo webhook test first to create a patient');
    process.exit(1);
  }

  const testPatient = patients[0];
  console.log(`✅ Found patient: ${testPatient.inmate_name} (${testPatient.id})`);
  console.log();

  // Test update payload
  const updatePayload = {
    patientId: testPatient.id,
    updates: {
      'TB diagnosed (Y/N)': 'Y',
      'Date of TB Diagnosed (dd/mm/yy)': '2025-01-27',
      'Type of TB Diagnosed (P/EP)': 'P',
      'Remarks': `Test update at ${new Date().toISOString()}`
    }
  };

  console.log('📋 Update Payload:');
  console.log(JSON.stringify(updatePayload, null, 2));
  console.log();

  console.log('🔄 Sending POST request to /api/patient-sync...');
  const startTime = Date.now();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify(updatePayload)
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    console.log('📊 RESPONSE:');
    console.log(`Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
    console.log(`Duration: ${duration}ms`);
    console.log('Body:', JSON.stringify(data, null, 2));
    console.log();

    // Verify response structure
    console.log('🔍 VERIFICATION:');
    
    if (response.ok && data.success) {
      console.log('✅ Patient update succeeded');
    } else {
      console.log('❌ Patient update failed:', data.error);
    }

    if (duration < 2000) {
      console.log(`✅ Response returned quickly (${duration}ms < 2000ms)`);
    } else {
      console.log(`⚠️  Response took longer than expected (${duration}ms)`);
    }

    if (data.patient) {
      console.log('✅ Updated patient data in response');
      console.log(`   - tb_diagnosed: ${data.patient.tb_diagnosed}`);
      console.log(`   - tb_diagnosis_date: ${data.patient.tb_diagnosis_date}`);
      console.log(`   - tb_type: ${data.patient.tb_type}`);
    } else {
      console.log('❌ Missing patient data in response');
    }

    // Verify NO sync tracking fields
    const hasSyncFields = 
      data.sheetsSync !== undefined || 
      data.sheetsSyncError !== undefined ||
      data.patient?.synced_to_sheets !== undefined ||
      data.patient?.sheets_sync_attempts !== undefined;

    if (!hasSyncFields) {
      console.log('✅ No sync tracking fields in response (fire-and-forget working)');
    } else {
      console.log('❌ FAILED: Response contains sync tracking fields:', {
        sheetsSync: data.sheetsSync,
        sheetsSyncError: data.sheetsSyncError,
        synced_to_sheets: data.patient?.synced_to_sheets,
        sheets_sync_attempts: data.patient?.sheets_sync_attempts
      });
    }

    console.log();
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    
    if (response.ok && data.success && duration < 2000 && !hasSyncFields) {
      console.log('✅ ALL TESTS PASSED');
      console.log('✅ Patient update is fast and non-blocking');
      console.log('✅ Fire-and-forget sync working correctly');
      console.log('✅ No sync tracking in response');
    } else {
      console.log('❌ SOME TESTS FAILED - Review output above');
    }

    console.log();
    console.log('⏳ Check server logs for async Sheets sync results...');
    console.log('   Look for: "[sheetsSync] ✅ Mirror sync update: ..."');

  } catch (error) {
    console.error('❌ REQUEST FAILED:', error);
    console.log();
    console.log('💡 Make sure dev server is running: bun run dev');
  }
}

// Run test
testPatientSync().then(() => {
  setTimeout(() => process.exit(0), 2000);
});
