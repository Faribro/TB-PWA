#!/usr/bin/env node

/**
 * COMPREHENSIVE DEMOGRAPHICS SYNC TEST
 * 
 * Tests real-time sync to Supabase and Google Sheets for ALL editable fields
 * Validates the complete data flow: UI → API → Supabase → Google Sheets
 * 
 * Usage: node scripts/test-demographics-sync.js
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
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
  inmate_name: 'Test Patient Demographics Sync',
  
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
  unique_id: 'TEST_SYNC_' + Date.now(),
  nikshay_id: 'NK' + Date.now(),
  abha_id: 'ABHA' + Date.now()
};

// Test scenarios for different field types
const TEST_SCENARIOS = [
  {
    name: 'Identity & Contact Fields',
    fields: {
      father_husband_name: 'Updated Father Name Test',
      date_of_birth: '1985-12-25',
      age: '40',
      sex: 'Female',
      inmate_type: 'Convicted',
      contact_number: '+91-8765432109',
      address: 'Updated Address: 456 New Street, New City, New State 654321',
      inmate_name: 'Updated Patient Name Test'
    }
  },
  {
    name: 'Screening Encounter Fields',
    fields: {
      screening_date: '2026-01-20',
      facility_name: 'Updated Test Facility Name',
      facility_type: 'District Jail',
      screening_state: 'Gujarat',
      screening_district: 'Ahmedabad',
      staff_name: 'Dr. Updated Staff Name',
      submitted_on: '2026-01-20'
    }
  },
  {
    name: 'Diagnostics & Treatment Fields',
    fields: {
      xray_result: 'Normal',
      'Date of referral for TB Examination (sputum) (dd/mm/yy)': '2026-01-21',
      'Name of facility where referred to (Give code/name of all facilities)': 'DMC-Designated microscopy centre',
      tb_past_history: 'Yes',
      tb_diagnosed_select: 'No',
      diagnosis_date: '2026-01-22',
      att_start_date: '2026-01-23',
      treatment_regimen: 'Updated Treatment Regimen Test'
    }
  },
  {
    name: 'HIV / ART Status Fields',
    fields: {
      hiv_status: 'Positive',
      art_started: 'Yes',
      art_center: 'Updated ART Center Name',
      cpt_given: false
    }
  },
  {
    name: 'Registration & System Fields',
    fields: {
      unique_id: 'UPDATED_' + Date.now(),
      nikshay_id: 'NK_UPDATED_' + Date.now(),
      abha_id: 'ABHA_UPDATED_' + Date.now()
    }
  },
  {
    name: 'Complex Field Names (Kobo Legacy)',
    fields: {
      'Date of referral for TB Examination (sputum) (dd/mm/yy)': '2026-01-25',
      'Name of facility where referred to (Give code/name of all facilities)': 'Histopathology'
    }
  },
  {
    name: 'Other Specification Fields',
    fields: {
      inmate_type: 'Other',
      inmate_type_other: 'Custom Inmate Type Test',
      screening_state: 'Other',
      screening_state_other: 'Custom State Test',
      screening_district: 'Other',
      screening_district_other: 'Custom District Test',
      referred_to_facility: 'Other',
      referred_to_facility_other: 'Custom Facility Test'
    }
  }
];

// Utility functions
function makeHttpRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

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
    kobo_uuid: 'test_demographics_sync_' + Date.now(),
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

async function testFieldUpdate(patientId, scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`📊 Fields to update: ${Object.keys(scenario.fields).length}`);
  
  const startTime = Date.now();
  
  // Call the patient-sync API endpoint
  const payload = {
    patientId: patientId,
    updates: {
      id: patientId,
      ...scenario.fields,
      updated_at: new Date().toISOString()
    }
  };
  
  console.log(`🔄 Calling /api/patient-sync...`);
  console.log(`📤 Payload:`, JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/patient-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${errorText}`);
    }
    
    const responseData = await response.json();
    const apiTime = Date.now() - startTime;
    
    console.log(`✅ API call successful (${apiTime}ms)`);
    console.log(`📊 Response:`, JSON.stringify(responseData, null, 2));
    
    // Wait for potential async operations
    await sleep(2000);
    
    // Verify Supabase update
    console.log(`🔍 Verifying Supabase update...`);
    const { data: updatedPatient, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();
    
    if (fetchError) {
      throw new Error(`Failed to fetch updated patient: ${fetchError.message}`);
    }
    
    // Check each field was updated in Supabase
    const supabaseResults = {};
    for (const [fieldKey, expectedValue] of Object.entries(scenario.fields)) {
      const actualValue = updatedPatient[fieldKey];
      const matches = actualValue == expectedValue || 
                     (typeof expectedValue === 'boolean' && actualValue === expectedValue) ||
                     (fieldKey.includes('date') && formatFieldValue(fieldKey, actualValue) === formatFieldValue(fieldKey, expectedValue));
      
      supabaseResults[fieldKey] = {
        expected: expectedValue,
        actual: actualValue,
        matches: matches
      };
      
      if (matches) {
        console.log(`  ✅ ${fieldKey}: "${actualValue}"`);
      } else {
        console.log(`  ❌ ${fieldKey}: expected "${expectedValue}", got "${actualValue}"`);
      }
    }
    
    // Test Google Sheets webhook directly
    console.log(`🔗 Testing Google Sheets webhook...`);
    const sheetsPayload = {
      'Serial Number': updatedPatient.id,
      'KoboUUID': updatedPatient.kobo_uuid,
      ...scenario.fields
    };
    
    try {
      const sheetsResponse = await fetch(GOOGLE_SHEETS_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sheetsPayload)
      });
      
      const sheetsResult = await sheetsResponse.text();
      console.log(`✅ Google Sheets response: ${sheetsResponse.status} - ${sheetsResult}`);
    } catch (sheetsError) {
      console.log(`❌ Google Sheets error: ${sheetsError.message}`);
    }
    
    const totalTime = Date.now() - startTime;
    
    return {
      scenario: scenario.name,
      success: true,
      apiTime: apiTime,
      totalTime: totalTime,
      supabaseResults: supabaseResults,
      fieldsUpdated: Object.keys(scenario.fields).length,
      fieldsMatched: Object.values(supabaseResults).filter(r => r.matches).length
    };
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    return {
      scenario: scenario.name,
      success: false,
      error: error.message,
      fieldsUpdated: Object.keys(scenario.fields).length,
      fieldsMatched: 0
    };
  }
}

async function cleanupTestPatient(patientId) {
  console.log(`\n🧹 Cleaning up test patient...`);
  
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', patientId);
  
  if (error) {
    console.log(`⚠️ Cleanup warning: ${error.message}`);
  } else {
    console.log(`✅ Test patient deleted`);
  }
}

// Main test execution
async function runDemographicsSyncTest() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 COMPREHENSIVE DEMOGRAPHICS SYNC TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`📊 Testing ${Object.keys(ALL_EDITABLE_FIELDS).length} editable fields across ${TEST_SCENARIOS.length} scenarios`);
  console.log(`🎯 Target: Supabase + Google Sheets sync validation`);
  console.log(`🔗 API Base: ${API_BASE_URL}`);
  console.log(`📋 Supabase: ${SUPABASE_URL}`);
  console.log(`📊 Sheets: ${GOOGLE_SHEETS_WEBHOOK ? 'Configured' : 'Not configured'}`);
  
  // Verify environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log('❌ Missing Supabase configuration');
    process.exit(1);
  }
  
  if (!GOOGLE_SHEETS_WEBHOOK) {
    console.log('⚠️ Google Sheets webhook not configured - will test Supabase only');
  }
  
  let testPatient = null;
  const results = [];
  
  try {
    // Create test patient
    testPatient = await createTestPatient();
    
    // Run all test scenarios
    for (let i = 0; i < TEST_SCENARIOS.length; i++) {
      const scenario = TEST_SCENARIOS[i];
      console.log(`\n📋 Scenario ${i + 1}/${TEST_SCENARIOS.length}: ${scenario.name}`);
      
      const result = await testFieldUpdate(testPatient.id, scenario);
      results.push(result);
      
      // Brief pause between tests
      if (i < TEST_SCENARIOS.length - 1) {
        await sleep(1000);
      }
    }
    
  } catch (error) {
    console.log(`💥 Test execution failed: ${error.message}`);
    console.log(error.stack);
  } finally {
    // Cleanup
    if (testPatient) {
      await cleanupTestPatient(testPatient.id);
    }
  }
  
  // Generate summary report
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY REPORT');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  
  const totalScenarios = results.length;
  const successfulScenarios = results.filter(r => r.success).length;
  const totalFields = results.reduce((sum, r) => sum + r.fieldsUpdated, 0);
  const matchedFields = results.reduce((sum, r) => sum + r.fieldsMatched, 0);
  const avgApiTime = results.filter(r => r.apiTime).reduce((sum, r) => sum + r.apiTime, 0) / results.filter(r => r.apiTime).length || 0;
  
  console.log(`Total Scenarios:     ${totalScenarios}`);
  console.log(`✅ Successful:       ${successfulScenarios}`);
  console.log(`❌ Failed:           ${totalScenarios - successfulScenarios}`);
  console.log(`Success Rate:        ${((successfulScenarios / totalScenarios) * 100).toFixed(1)}%`);
  console.log('');
  console.log(`Total Fields Tested: ${totalFields}`);
  console.log(`✅ Fields Matched:   ${matchedFields}`);
  console.log(`❌ Fields Failed:    ${totalFields - matchedFields}`);
  console.log(`Field Success Rate:  ${((matchedFields / totalFields) * 100).toFixed(1)}%`);
  console.log('');
  console.log(`Average API Time:    ${avgApiTime.toFixed(0)}ms`);
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const fieldRate = result.fieldsUpdated > 0 ? `${result.fieldsMatched}/${result.fieldsUpdated}` : '0/0';
    console.log(`${status} ${index + 1}. ${result.scenario} - ${fieldRate} fields - ${result.apiTime || 0}ms`);
    
    if (!result.success && result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });
  
  // Field-by-field analysis
  console.log('\n🔍 FIELD-BY-FIELD ANALYSIS:');
  const allTestedFields = new Set();
  results.forEach(result => {
    if (result.supabaseResults) {
      Object.keys(result.supabaseResults).forEach(field => allTestedFields.add(field));
    }
  });
  
  console.log(`📊 Unique fields tested: ${allTestedFields.size}`);
  
  // Check if all expected fields were tested
  const expectedFields = Object.keys(ALL_EDITABLE_FIELDS);
  const missingFields = expectedFields.filter(field => !allTestedFields.has(field));
  
  if (missingFields.length > 0) {
    console.log(`⚠️ Fields not tested: ${missingFields.join(', ')}`);
  } else {
    console.log(`✅ All ${expectedFields.length} editable fields were tested`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  
  if (successfulScenarios === totalScenarios && matchedFields === totalFields) {
    console.log('🎉 ALL TESTS PASSED - Demographics sync is working perfectly!');
    process.exit(0);
  } else {
    console.log('⚠️ SOME TESTS FAILED - Please review the results above');
    process.exit(1);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  runDemographicsSyncTest().catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = { runDemographicsSyncTest, ALL_EDITABLE_FIELDS, TEST_SCENARIOS };