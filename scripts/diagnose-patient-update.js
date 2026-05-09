#!/usr/bin/env node

/**
 * Comprehensive Patient Update Diagnostic
 * Tests: Schema → API → Database → Response
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wwcgybgvfulotflitogu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runDiagnostics() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔬 PATIENT UPDATE COMPREHENSIVE DIAGNOSTIC');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('');

  // Test 1: Check schema
  console.log('📋 TEST 1: DATABASE SCHEMA CHECK');
  console.log('─'.repeat(75));
  
  const clinicalColumns = [
    'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
    'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status',
    'art_status', 'art_number', 'nikshay_abha_id', 'registration_date', 'remarks'
  ];

  const schemaResult = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'patients'
        ORDER BY column_name
      `
    });
  
  const { data: schemaData, error: schemaError } = schemaResult;

  if (schemaError || !schemaData) {
    console.log('⚠️  Cannot check schema via RPC, checking via select...');
    
    // Try to select from patients table to see what columns exist
    const { data: samplePatient, error: selectError } = await supabase
      .from('patients')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (selectError) {
      console.log('❌ Cannot access patients table:', selectError.message);
    } else if (samplePatient) {
      const existingColumns = Object.keys(samplePatient);
      console.log(`✅ Found ${existingColumns.length} columns in patients table`);
      console.log('');
      console.log('Clinical columns status:');
      clinicalColumns.forEach(col => {
        const exists = existingColumns.includes(col);
        console.log(`  ${exists ? '✅' : '❌'} ${col}`);
      });
    }
  } else {
    console.log('✅ Schema check complete');
  }

  console.log('');

  // Test 2: Find a test patient
  console.log('🔍 TEST 2: FIND TEST PATIENT');
  console.log('─'.repeat(75));

  const { data: patients, error: findError } = await supabase
    .from('patients')
    .select('id, kobo_uuid, inmate_name, unique_id')
    .limit(1);

  if (findError || !patients || patients.length === 0) {
    console.log('❌ No patients found:', findError?.message);
    return;
  }

  const testPatient = patients[0];
  console.log('✅ Found test patient:');
  console.log(`  ID: ${testPatient.id}`);
  console.log(`  Kobo UUID: ${testPatient.kobo_uuid}`);
  console.log(`  Name: ${testPatient.inmate_name}`);
  console.log('');

  // Test 3: Direct database update
  console.log('💾 TEST 3: DIRECT DATABASE UPDATE');
  console.log('─'.repeat(75));

  const testData = {
    referral_date: '2026-05-10',
    referred_facility: 'TEST FACILITY',
    tb_diagnosed: 'Y',
    tb_diagnosis_date: '2026-05-09',
    hiv_status: 'Negative'
  };

  console.log('Updating patient with:', JSON.stringify(testData, null, 2));

  const { error: updateError } = await supabase
    .from('patients')
    .update(testData)
    .eq('id', testPatient.id);

  if (updateError) {
    console.log('❌ Update failed:', updateError.message);
    console.log('   Code:', updateError.code);
    console.log('   Details:', updateError.details);
    console.log('   Hint:', updateError.hint);
    
    // Check if it's a column not found error
    if (updateError.message.includes('column') || updateError.code === '42703') {
      console.log('');
      console.log('⚠️  MISSING COLUMNS DETECTED');
      console.log('   Run this SQL in Supabase SQL Editor:');
      console.log('');
      console.log('   ALTER TABLE patients');
      clinicalColumns.forEach((col, i) => {
        console.log(`   ADD COLUMN IF NOT EXISTS ${col} TEXT${i < clinicalColumns.length - 1 ? ',' : ';'}`);
      });
    }
    return;
  }

  console.log('✅ Update succeeded');
  console.log('');

  // Test 4: Verify data persisted
  console.log('🔎 TEST 4: VERIFY DATA PERSISTENCE');
  console.log('─'.repeat(75));

  const { data: verifyPatient, error: verifyError } = await supabase
    .from('patients')
    .select('*')
    .eq('id', testPatient.id)
    .single();

  if (verifyError) {
    console.log('❌ Verification failed:', verifyError.message);
    return;
  }

  console.log('Checking persisted values:');
  let allMatch = true;
  Object.entries(testData).forEach(([key, expectedValue]) => {
    const actualValue = verifyPatient[key];
    const matches = actualValue === expectedValue;
    console.log(`  ${matches ? '✅' : '❌'} ${key}: expected="${expectedValue}" got="${actualValue}"`);
    if (!matches) allMatch = false;
  });

  console.log('');
  if (allMatch) {
    console.log('✅ ALL DATA PERSISTED CORRECTLY');
  } else {
    console.log('❌ DATA MISMATCH - Some fields did not persist');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ DIAGNOSTIC COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════════════');
}

runDiagnostics().catch(console.error);
