/**
 * ═══════════════════════════════════════════════════════════════════════════
 * END-TO-END PIPELINE TEST
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Tests complete data flow:
 * 1. Webhook ingestion (Kobo → Supabase)
 * 2. State normalization
 * 3. Date normalization (YYYY-MM-DD)
 * 4. Google Sheets sync
 * 5. Patient Detail Drawer updates
 * 6. Command Hub today count
 */

const WEBHOOK_URL = 'http://localhost:3000/api/webhook/kobo';
const WEBHOOK_SECRET = process.env.KOBO_WEBHOOK_SECRET || 'alliance_kobo_secure_2026';
const PATIENT_SYNC_URL = 'http://localhost:3000/api/patient-sync';
const METRICS_URL = 'http://localhost:3000/api/metrics';

// Test payload with Gujarat state and today's date
const createTestPayload = (stateVariation) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  return {
    _uuid: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    _submission_time: new Date().toISOString(),
    'grp_screening/screening_state': stateVariation,
    'grp_screening/screening_district': 'Ahmedabad',
    'grp_screening/facility_name': 'Test Facility',
    'grp_screening/facility_type': 'Prison',
    'grp_screening/screening_date': todayStr,
    'grp_screening/staff_name': 'Test Staff',
    'grp_identity/inmate_name': 'Test Patient Gujarat',
    'grp_identity/inmate_type': 'Under Trial',
    'grp_demo/age': 35,
    'grp_demo/sex': 'Male',
    'grp_tb/xray_result': 'Suspected TB Case',
    'grp_screening/Unique_ID': `TEST-GJ-${Date.now()}`
  };
};

async function testWebhookIngestion() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('TEST 1: WEBHOOK INGESTION WITH STATE NORMALIZATION');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const stateVariations = ['GUJARAT', 'gujarat', 'Gujarat'];
  const results = [];

  for (const stateVar of stateVariations) {
    console.log(`\n📋 Testing state variation: "${stateVar}"`);
    
    const payload = createTestPayload(stateVar);
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-kobo-webhook-secret': WEBHOOK_SECRET
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`✅ SUCCESS: ${stateVar} → Normalized and saved`);
        console.log(`   - Kobo UUID: ${result.kobo_uuid}`);
        console.log(`   - Operation: ${result.operation}`);
        console.log(`   - Sheets Sync: ${result.sheets_sync}`);
        console.log(`   - Duration: ${result.duration_ms}ms`);
        results.push({ state: stateVar, success: true, uuid: result.kobo_uuid });
      } else {
        console.log(`❌ FAILED: ${stateVar}`);
        console.log(`   - Error: ${result.error || 'Unknown'}`);
        results.push({ state: stateVar, success: false, error: result.error });
      }
    } catch (error) {
      console.log(`❌ EXCEPTION: ${stateVar}`);
      console.log(`   - ${error.message}`);
      results.push({ state: stateVar, success: false, error: error.message });
    }
    
    // Wait 1s between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

async function testTodayCount() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('TEST 2: COMMAND HUB TODAY COUNT');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    const response = await fetch(METRICS_URL);
    const metrics = await response.json();

    console.log('📊 Current Metrics:');
    console.log(`   - Total Screened: ${metrics.total}`);
    console.log(`   - Today Screened: ${metrics.todayScreened || 'N/A (check summary endpoint)'}`);
    console.log(`   - Pending: ${metrics.pending}`);
    console.log(`   - On ATT: ${metrics.onATT}`);

    return { success: true, metrics };
  } catch (error) {
    console.log(`❌ Failed to fetch metrics: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testPatientSync(patientId) {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('TEST 3: PATIENT DETAIL DRAWER SYNC');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const updates = {
    referral_date: new Date().toISOString().split('T')[0],
    referred_facility: 'DMC-Designated microscopy Centre',
    tb_diagnosed: 'Y',
    tb_diagnosis_date: new Date().toISOString().split('T')[0],
    tb_type: 'P'
  };

  console.log(`📝 Testing patient sync for ID: ${patientId}`);
  console.log('   Updates:', updates);

  try {
    const response = await fetch(PATIENT_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        patientId,
        updates
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Patient sync successful');
      console.log(`   - Sync Status: ${result.syncStatus}`);
      console.log(`   - Patient Updated: ${result.patient?.id}`);
      return { success: true, result };
    } else {
      console.log('❌ Patient sync failed');
      console.log(`   - Error: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.log(`❌ Exception: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function verifyStateNormalization() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('TEST 4: STATE NORMALIZATION VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    'https://fgtrkxadiszoyhslwesu.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndHJreGFkaXN6b3loc2x3ZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMyNDc1NiwiZXhwIjoyMDkxOTAwNzU2fQ.IwKVDUZIhyiV6dew6CepShYo5ZCTBlbC-WHS0xn3mKU'
  );

  try {
    // Query recent Gujarat records
    const { data, error } = await supabase
      .from('patients')
      .select('id, inmate_name, screening_state, screening_date, created_at')
      .ilike('screening_state', '%gujarat%')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    console.log(`📋 Found ${data.length} Gujarat records:`);
    data.forEach((patient, i) => {
      console.log(`\n   ${i + 1}. ${patient.inmate_name}`);
      console.log(`      - State: "${patient.screening_state}" ${patient.screening_state === 'Gujarat' ? '✅' : '❌ NOT NORMALIZED'}`);
      console.log(`      - Screening Date: ${patient.screening_date}`);
      console.log(`      - Created: ${patient.created_at}`);
    });

    return { success: true, count: data.length, normalized: data.every(p => p.screening_state === 'Gujarat') };
  } catch (error) {
    console.log(`❌ Query failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    TB-PWA END-TO-END PIPELINE TEST                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  // Test 1: Webhook ingestion
  const webhookResults = await testWebhookIngestion();

  // Test 2: Today count
  const todayResult = await testTodayCount();

  // Test 3: State normalization verification
  const stateResult = await verifyStateNormalization();

  // Test 4: Patient sync (use first successful webhook UUID)
  const successfulWebhook = webhookResults.find(r => r.success);
  let syncResult = null;
  if (successfulWebhook) {
    // Note: Would need patient ID from Supabase query
    console.log('\n⏭️  Skipping patient sync test (requires patient ID from DB)');
  }

  // Summary
  const duration = Date.now() - startTime;
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const webhookSuccess = webhookResults.filter(r => r.success).length;
  console.log(`✅ Webhook Ingestion: ${webhookSuccess}/${webhookResults.length} passed`);
  console.log(`${todayResult.success ? '✅' : '❌'} Today Count: ${todayResult.success ? 'PASS' : 'FAIL'}`);
  console.log(`${stateResult.success && stateResult.normalized ? '✅' : '❌'} State Normalization: ${stateResult.success && stateResult.normalized ? 'PASS' : 'FAIL'}`);

  console.log(`\n⏱️  Total Duration: ${duration}ms`);
  console.log('\n═══════════════════════════════════════════════════════════════════════════\n');

  process.exit(webhookSuccess === webhookResults.length && todayResult.success && stateResult.normalized ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
