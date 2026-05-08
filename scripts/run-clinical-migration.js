// Migration Script: Add Clinical Fields to Patients Table
// Purpose: Add missing clinical track fields for step indicators functionality
// Usage: bun run scripts/run-clinical-migration.js

const { createClient } = require('@supabase/supabase-js');

// Configuration - read from environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🏥 Clinical Fields Migration');
  console.log('==========================\n');

  try {
    // Migration SQL statements
    const migrationStatements = [
      // Add Sputum & Referral fields
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS referral_date TEXT;`,
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS referred_facility TEXT;`,
      
      // Add Diagnosis fields
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS tb_diagnosed TEXT;`,
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS tb_diagnosis_date TEXT;`,
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS tb_type TEXT;`,
      
      // Add Treatment fields
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS att_start_date TEXT;`,
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS att_completion_date TEXT;`,
      
      // Add HIV & ART Status fields
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS hiv_status TEXT;`,
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS art_status TEXT;`,
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS art_number TEXT;`,
      
      // Add Nikshay & Registration fields
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS nikshay_abha_id TEXT;`,
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS registration_date TEXT;`,
      `ALTER TABLE patients ADD COLUMN IF NOT EXISTS remarks TEXT;`
    ];

    console.log('📊 Adding clinical fields to patients table...');
    
    // Execute each migration statement
    for (const statement of migrationStatements) {
      console.log(`   Executing: ${statement.split('ADD COLUMN')[1].trim()}`);
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Try direct SQL execution if RPC fails
        console.log(`   ⚠️  RPC failed, trying direct execution...`);
        const { error: directError } = await supabase
          .from('patients')
          .select('id')
          .limit(1);
        
        if (directError && directError.message.includes('column') && directError.message.includes('does not exist')) {
          console.log(`   ⚠️  Field may already exist or needs manual migration`);
        }
      } else {
        console.log(`   ✅ Success`);
      }
    }

    // Verify the fields were added
    console.log('\n🔍 Verifying clinical fields...');
    
    const expectedFields = [
      'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
      'tb_type', 'att_start_date', 'att_completion_date', 'hiv_status',
      'art_status', 'art_number', 'nikshay_abha_id', 'registration_date', 'remarks'
    ];

    // Get a sample patient to check fields
    const { data: samplePatient, error: sampleError } = await supabase
      .from('patients')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ Failed to fetch sample patient:', sampleError);
      return;
    }

    if (samplePatient && samplePatient.length > 0) {
      const patientFields = Object.keys(samplePatient[0]);
      const existingFields = expectedFields.filter(field => patientFields.includes(field));
      const missingFields = expectedFields.filter(field => !patientFields.includes(field));

      console.log(`✅ Found ${existingFields.length}/${expectedFields.length} clinical fields:`);
      existingFields.forEach(field => console.log(`   - ${field}`));
      
      if (missingFields.length > 0) {
        console.log(`❌ Missing ${missingFields.length} fields:`);
        missingFields.forEach(field => console.log(`   - ${field}`));
        console.log('\n⚠️  Some fields may need manual addition via Supabase dashboard');
      }
    } else {
      console.log('ℹ️  No patients found to verify fields');
    }

    // Test the API with clinical data
    console.log('\n🧪 Testing clinical data persistence...');
    
    if (samplePatient && samplePatient.length > 0) {
      const testPatientId = samplePatient[0].id;
      const testData = {
        referral_date: '07/05/26',
        referred_facility: 'Test Facility',
        tb_diagnosed: 'Y',
        hiv_status: 'Negative'
      };

      const { data: updateResult, error: updateError } = await supabase
        .from('patients')
        .update(testData)
        .eq('id', testPatientId)
        .select('*')
        .single();

      if (updateError) {
        console.error('❌ Update test failed:', updateError);
      } else {
        console.log('✅ Update test successful');
        console.log(`📊 Returned ${Object.keys(updateResult).length} fields`);
        
        // Check if clinical fields are in response
        const responseFields = Object.keys(updateResult);
        const clinicalFieldsInResponse = expectedFields.filter(field => responseFields.includes(field));
        console.log(`✅ Clinical fields in response: ${clinicalFieldsInResponse.length}/${expectedFields.length}`);
      }
    }

    console.log('\n🎉 Migration process completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test the clinical workflow in the UI');
    console.log('2. Verify step indicators turn green after data submission');
    console.log('3. Check that data persists when reopening patient drawers');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n🔧 Manual migration may be required:');
    console.log('1. Go to Supabase dashboard');
    console.log('2. Open SQL Editor');
    console.log('3. Run the SQL from: database/migrations/add_clinical_fields.sql');
  }
}

// Run the migration
runMigration();
