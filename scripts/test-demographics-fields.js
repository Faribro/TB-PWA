/**
 * Demographics Field Diagnostic Script
 * Tests if address, symptoms_10s, kobo_uuid, and serial_number fields are populated in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testDemographicsFields() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 DEMOGRAPHICS FIELDS DIAGNOSTIC TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    // Test 1: Check if fields exist in database schema
    console.log('📊 TEST 1: Checking database schema...\n');
    
    const { data: schemaData, error: schemaError } = await supabase
      .from('patients')
      .select('*')
      .limit(1);

    if (schemaError) {
      console.error('❌ Schema check failed:', schemaError.message);
      return;
    }

    if (schemaData && schemaData.length > 0) {
      const columns = Object.keys(schemaData[0]);
      console.log('✅ Available columns in patients table:', columns.length);
      
      const targetFields = ['address', 'symptoms_10s', 'kobo_uuid', 'serial_number'];
      console.log('\n🎯 Checking target fields:');
      targetFields.forEach(field => {
        const exists = columns.includes(field);
        console.log(`   ${exists ? '✅' : '❌'} ${field}: ${exists ? 'EXISTS' : 'MISSING'}`);
      });
    }

    // Test 2: Count records with populated fields
    console.log('\n\n📊 TEST 2: Counting populated records...\n');

    const { count: totalCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    console.log(`📈 Total patients: ${totalCount}`);

    // Check address field
    const { count: addressCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .not('address', 'is', null)
      .neq('address', '');

    console.log(`📍 Patients with address: ${addressCount} (${((addressCount / totalCount) * 100).toFixed(1)}%)`);

    // Check symptoms_10s field
    const { count: symptomsCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .not('symptoms_10s', 'is', null)
      .neq('symptoms_10s', '');

    console.log(`🩺 Patients with symptoms_10s: ${symptomsCount} (${((symptomsCount / totalCount) * 100).toFixed(1)}%)`);

    // Check kobo_uuid field
    const { count: koboCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .not('kobo_uuid', 'is', null)
      .neq('kobo_uuid', '');

    console.log(`🔑 Patients with kobo_uuid: ${koboCount} (${((koboCount / totalCount) * 100).toFixed(1)}%)`);

    // Check serial_number field
    const { count: serialCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .not('serial_number', 'is', null)
      .neq('serial_number', '');

    console.log(`#️⃣  Patients with serial_number: ${serialCount} (${((serialCount / totalCount) * 100).toFixed(1)}%)`);

    // Test 3: Sample data inspection
    console.log('\n\n📊 TEST 3: Inspecting sample records...\n');

    const { data: sampleData, error: sampleError } = await supabase
      .from('patients')
      .select('id, inmate_name, address, symptoms_10s, kobo_uuid, serial_number')
      .limit(5);

    if (sampleError) {
      console.error('❌ Sample data fetch failed:', sampleError.message);
      return;
    }

    console.log('📋 Sample records (first 5):');
    sampleData.forEach((patient, idx) => {
      console.log(`\n   Record ${idx + 1}: ${patient.inmate_name || 'N/A'}`);
      console.log(`   ├─ ID: ${patient.id}`);
      console.log(`   ├─ Address: ${patient.address ? `"${patient.address.substring(0, 50)}${patient.address.length > 50 ? '...' : ''}"` : '❌ NULL/EMPTY'}`);
      console.log(`   ├─ Symptoms (10S): ${patient.symptoms_10s || '❌ NULL/EMPTY'}`);
      console.log(`   ├─ Kobo UUID: ${patient.kobo_uuid || '❌ NULL/EMPTY'}`);
      console.log(`   └─ Serial Number: ${patient.serial_number || '❌ NULL/EMPTY'}`);
    });

    // Test 4: Check for alternative column names
    console.log('\n\n📊 TEST 4: Checking for alternative column names...\n');

    const alternativeNames = {
      address: ['address', 'patient_address', 'inmate_address', 'residential_address'],
      symptoms_10s: ['symptoms_10s', 'symptoms10s', 'ten_symptoms', 'symptoms', 'symptom_10s'],
      kobo_uuid: ['kobo_uuid', 'kobouuid', 'uuid', 'kobo_id'],
      serial_number: ['serial_number', 'serial_no', 'serialnumber', 'serial']
    };

    if (schemaData && schemaData.length > 0) {
      const columns = Object.keys(schemaData[0]);
      
      Object.entries(alternativeNames).forEach(([field, alternatives]) => {
        console.log(`\n🔍 Searching for "${field}":`);
        const matches = alternatives.filter(alt => columns.includes(alt));
        if (matches.length > 0) {
          console.log(`   ✅ Found: ${matches.join(', ')}`);
        } else {
          console.log(`   ❌ No matches found`);
          // Show similar column names
          const similar = columns.filter(col => 
            col.toLowerCase().includes(field.split('_')[0].toLowerCase())
          );
          if (similar.length > 0) {
            console.log(`   💡 Similar columns: ${similar.join(', ')}`);
          }
        }
      });
    }

    // Test 5: Check specific patient by ID (if provided)
    const testPatientId = process.argv[2];
    if (testPatientId) {
      console.log(`\n\n📊 TEST 5: Checking specific patient (ID: ${testPatientId})...\n`);

      const { data: specificPatient, error: specificError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', testPatientId)
        .single();

      if (specificError) {
        console.error(`❌ Patient not found: ${specificError.message}`);
      } else {
        console.log('✅ Patient found:');
        console.log(`   Name: ${specificPatient.inmate_name || 'N/A'}`);
        console.log(`   Address: ${specificPatient.address || '❌ NULL/EMPTY'}`);
        console.log(`   Symptoms (10S): ${specificPatient.symptoms_10s || '❌ NULL/EMPTY'}`);
        console.log(`   Kobo UUID: ${specificPatient.kobo_uuid || '❌ NULL/EMPTY'}`);
        console.log(`   Serial Number: ${specificPatient.serial_number || '❌ NULL/EMPTY'}`);
        
        console.log('\n   📦 Full patient object:');
        console.log(JSON.stringify(specificPatient, null, 2));
      }
    }

    // Summary
    console.log('\n\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    const issues = [];
    
    if (addressCount === 0) issues.push('⚠️  No patients have address data');
    if (symptomsCount === 0) issues.push('⚠️  No patients have symptoms_10s data');
    if (koboCount === 0) issues.push('⚠️  No patients have kobo_uuid data');
    if (serialCount === 0) issues.push('⚠️  No patients have serial_number data');

    if (issues.length > 0) {
      console.log('🔴 ISSUES FOUND:\n');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('   1. Check if data is being imported correctly from KoboToolbox');
      console.log('   2. Verify field mappings in webhook/ETL scripts');
      console.log('   3. Check if column names match between Kobo and Supabase');
      console.log('   4. Run data migration script if needed');
    } else {
      console.log('✅ All target fields have data!');
      console.log('\n💡 If fields still not visible in UI:');
      console.log('   1. Check browser console for getValue() logs');
      console.log('   2. Verify patient prop is passed correctly to DemographicsCarousel');
      console.log('   3. Check if field keys match in getValue() calls');
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testDemographicsFields();
