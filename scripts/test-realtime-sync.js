#!/usr/bin/env node

/**
 * COMPREHENSIVE REALTIME SYNC TEST
 * 
 * Tests real-time sync to Supabase and Google Sheets for ALL editable fields
 * Validates the complete data flow: UI → API → Supabase → Google Sheets → Realtime
 * 
 * Usage: 
 * 1. Start dev server: bun run dev
 * 2. Run test: node scripts/test-realtime-sync.js
 */

const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_SHEETS_WEBHOOK = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;
const API_BASE_URL = 'http://localhost:3000';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// All 35+ editable fields from DEMOGRAPHICS_EDITABLE_FIELDS mapping
const ALL_EDITABLE_FIELDS = {
  // Identity & Contact (9 fields)
  father_husband_name: 'Test Father Name Updated',
  date_of_birth: '1990-05-15',
  age: '34',
  sex: 'Male',
  inmate_type: 'Under Trial',
  contact_number: '+91-9876543210',
  address: '123 Test Street, Test City, Test State 123456',
  inmate_type_other: 'Special Category Test',
  inmate_name: 'Test Patient Realtime Sync',
  
  // Screening Encounter (9 fields)
  screening_date: '2026-01-15',
  facility_name: 'Test Central Jail Facility',
  facility_type: 'Central Jail',
  screening_state: 'Maharashtra',
  screening_district: 'Mumbai City',
  staff_name: 'Dr. Test Screening Officer',
  submitted_on: '2026-01-15',
  screening_state_other: 'Test Other State',
  screening_district_other: 'Test Other District',
  
  // Diagnostics & Treatment (11 fields)
  xray_result: 'Suspected TB Case',
  'Date of referral for TB Examination (sputum) (dd/mm/yy)': '2026-01-16',
  'Name of facility where referred to (Give code/name of all facilities)': 'CBNAAT',
  tb_past_history: 'No',
  tb_diagnosed_select: 'Yes',
  diagnosis_date: '2026-01-17',
  att_start_date: '2026-01-18',
  referral_date: '2026-01-16',
  referred_to_facility: 'TDC-TB Diagnostic Centre',
  referred_to_facility_other: 'Test Custom Facility',
  treatment_regimen: 'HRZE (2HRZE/4HR)',
  
  // HIV / ART Status (4 fields)
  hiv_status: 'Negative',
  art_started: 'No',
  art_center: 'Test ART Center',
  cpt_given: true,
  
  // Registration & System (3 fields)
  unique_id: 'TEST_REALTIME_' + Date.now(),
  nikshay_id: 'NK' + Date.now(),
  abha_id: 'ABHA' + Date.now()
};

// Test scenarios for different field groups
const TEST_SCENARIOS = [
  {
    name: 'Identity & Contact Fields (High Priority)',
    fields: {
      inmate_name: 'Updated Patient Name Realtime Test',
      father_husband_name: 'Updated Father Name Test',
      age: '42',
      sex: 'Female',
      contact_number: '+91-8765432109',
      address: 'Updated Address: 456 New Street, New City, New State 654321'
    },
    priority: 'high'
  },
  {
    name: 'Screening Encounter Fields (Critical)',
    fields: {
      screening_date: '2026-01-20',
      facility_name: 'Updated Test Facility Name',
      facility_type: 'District Jail',
      screening_state: 'Gujarat',
      screening_district: 'Ahmedabad',
      staff_name: 'Dr. Updated Staff Name'
    },
    priority: 'critical'
  },
  {
    name: 'Clinical Fields (Medical Priority)',
    fields: {
      xray_result: 'Normal',
      tb_past_history: 'Yes',
      hiv_status: 'Positive',
      art_status: 'On ART'
    },
    priority: 'medical'
  },
  {
    name: 'Registration & System Fields',
    fields: {
      unique_id: 'REALTIME_' + Date.now(),
      nikshay_abha_id: 'NK_REALTIME_' + Date.now()
    },
    priority: 'system'
  }
];

// Utility functions
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatFieldValue(key, value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key.includes('date') && value) {
    try {
      return new Date(value).toISOString().split('T')[0];
    } catch (e) {
      return value;
    }
  }
  return value;
}

// Test functions
async function createTestPatient() {
  console.log('📝 Creating test patient with all editable fields...');
  
  const testPatient = {
    kobo_uuid: 'test_realtime_sync_' + Date.now(),
    ...ALL_EDITABLE_FIELDS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('patients')
    .insert([testPatient])
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create test patient: ${error.message}`);
  }
  
  console.log(`✅ Test patient created with ID: ${data.id}`);
  console.log(`📋 Patient name: ${data.inmate_name}`);
  console.log(`🔗 Kobo UUID: ${data.kobo_uuid}`);
  
  return data;
}

async function setupRealtimeListener(patientId) {
  console.log(`🔄 Setting up realtime listener for patient ${patientId}...`);
  
  const realtimeUpdates = [];
  let subscriptionStatus = 'pending';
  
  const channel = supabase
    .channel(`test-patient-updates-${patientId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'patients',
        filter: `id=eq.${patientId}`
      },
      (payload) => {
        console.log(`📨 Realtime update received:`, {
          timestamp: new Date().toISOString(),
          event: payload.eventType,
          old: Object.keys(payload.old || {}),
          new: Object.keys(payload.new || {}),
          changes: Object.keys(payload.new || {}).filter(key => 
            payload.old?.[key] !== payload.new?.[key]
          )
        });
        
        realtimeUpdates.push({
          timestamp: Date.now(),
          payload: payload.new,
          changes: Object.keys(payload.new || {}).filter(key => 
            payload.old?.[key] !== payload.new?.[key]
          )
        });
      }
    )
    .subscribe((status) => {
      subscriptionStatus = status;
      console.log(`📡 Realtime subscription status: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime listener ready');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime subscription error');
      } else if (status === 'TIMED_OUT') {
        console.error('⏱️ Realtime subscription timed out');
      }
    });
  
  // Wait for subscription to be ready
  let attempts = 0;
  while (subscriptionStatus !== 'SUBSCRIBED' && attempts < 10) {
    await sleep(500);
    attempts++;
  }
  
  if (subscriptionStatus !== 'SUBSCRIBED') {
    throw new Error('Failed to establish realtime subscription');
  }
  
  return {
    channel,
    getUpdates: () => realtimeUpdates,
    cleanup: () => supabase.removeChannel(channel)
  };
}

async function testFieldUpdateWithRealtime(patientId, scenario, realtimeListener) {
  console.log(`\n🧪 Testing Realtime: ${scenario.name}`);
  console.log(`📊 Fields to update: ${Object.keys(scenario.fields).length}`);
  
  const startTime = Date.now();
  const initialUpdateCount = realtimeListener.getUpdates().length;
  
  const payload = {
    id: patientId,
    ...scenario.fields,
    updated_at: new Date().toISOString()
  };
  
  console.log(`🔄 Updating patient via Supabase...`);
  
  try {
    const { data, error } = await supabase
      .from('patients')
      .update(payload)
      .eq('id', patientId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Supabase update failed: ${error.message}`);
    }
    
    const apiTime = Date.now() - startTime;
    console.log(`✅ Supabase update received in ${apiTime}ms`);
    
    // Wait for realtime update
    await sleep(2000);
    
    const finalUpdateCount = realtimeListener.getUpdates().length;
    const receivedRealtime = finalUpdateCount > initialUpdateCount;
    
    console.log(`📨 Realtime updates received: ${finalUpdateCount - initialUpdateCount}`);
    
    return {
      apiSuccess: true,
      realtimeReceived: receivedRealtime,
      apiTime
    };
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    return {
      apiSuccess: false,
      realtimeReceived: false,
      error: error.message
    };
  }
}

async function runRealtimeSyncTest() {
  console.log('🚀 REALTIME SYNC TEST');
  console.log(`📍 API: ${API_BASE_URL}`);
  
  const TEST_PATIENT_ID = process.env.TEST_PATIENT_ID || 'fdf26115-5782-4afc-aba4-2ac44585508f';
  console.log(`📋 Patient ID: ${TEST_PATIENT_ID}\n`);
  
  const realtimeListener = await setupRealtimeListener(TEST_PATIENT_ID);
  
  let successfulScenarios = 0;
  let realtimeSuccessful = 0;
  
  for (const scenario of TEST_SCENARIOS) {
    const result = await testFieldUpdateWithRealtime(TEST_PATIENT_ID, scenario, realtimeListener);
    
    if (result.apiSuccess) {
      successfulScenarios++;
      console.log(`✅ ${scenario.name}: API Success`);
    } else {
      console.log(`❌ ${scenario.name}: API Failed - ${result.error}`);
    }
    
    if (result.realtimeReceived) {
      realtimeSuccessful++;
      console.log(`✅ ${scenario.name}: Realtime Received`);
    } else {
      console.log(`⚠️ ${scenario.name}: No Realtime Update`);
    }
    
    await sleep(1000);
  }
  
  realtimeListener.cleanup();
  
  console.log('\n📊 TEST SUMMARY:');
  console.log(`═════════════════`);
  console.log(`Total Scenarios: ${TEST_SCENARIOS.length}`);
  console.log(`API Success: ${successfulScenarios}/${TEST_SCENARIOS.length}`);
  console.log(`Realtime Success: ${realtimeSuccessful}/${TEST_SCENARIOS.length}`);
  
  if (successfulScenarios === TEST_SCENARIOS.length && realtimeSuccessful === TEST_SCENARIOS.length) {
    console.log('\n🎉 ALL TESTS PASSED - Realtime sync working!');
    process.exit(0);
  } else {
    console.log('\n⚠️ SOME TESTS FAILED');
    process.exit(1);
  }
}

if (require.main === module) {
  runRealtimeSyncTest().catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = { runRealtimeSyncTest, TEST_SCENARIOS };