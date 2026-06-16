// Cleanup Script: Remove Duplicate Test Data
// Purpose: Clean up duplicate test patient records
// Usage: node scripts/cleanup-duplicate-test-data.js

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanupDuplicateTestData() {
  console.log('🧹 Cleaning up duplicate test data...');
  console.log('===============================\n');

  try {
    // Step 1: Find all test patients (by facility name or unique_id)
    console.log('📋 Step 1: Finding all test patients...');
    
    const { data: testPatients, error: fetchError } = await supabase
      .from('patients')
      .select('id, unique_id, inmate_name, facility_name, screening_date, created_at')
      .or('facility_name.ilike.%Central Jail Nagpur%,unique_id.ilike.%TEST-CJ-NGP%,inmate_name.ilike.%Test Patient%')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Failed to fetch test patients:', fetchError);
      return;
    }

    console.log(`✅ Found ${testPatients.length} test patient records:`);
    testPatients.forEach((patient, index) => {
      console.log(`  ${index + 1}. ID: ${patient.id}`);
      console.log(`     Unique ID: ${patient.unique_id}`);
      console.log(`     Name: ${patient.inmate_name}`);
      console.log(`     Facility: ${patient.facility_name}`);
      console.log(`     Date: ${patient.screening_date}`);
      console.log(`     Created: ${patient.created_at}`);
      console.log('');
    });

    if (testPatients.length <= 1) {
      console.log('✅ No duplicates found. Database is clean.');
      return;
    }

    // Step 2: Keep the most recent record, delete the rest
    console.log('🗑️  Step 2: Removing duplicates (keeping most recent)...');
    
    const toKeep = testPatients[0]; // Most recent (sorted by created_at desc)
    const toDelete = testPatients.slice(1); // All others
    
    console.log(`📌 Keeping: ${toKeep.id} (${toKeep.created_at})`);
    console.log(`🗑️  Deleting ${toDelete.length} duplicates...`);

    let deletedCount = 0;
    for (const patient of toDelete) {
      const { error: deleteError } = await supabase
        .from('patients')
        .delete()
        .eq('id', patient.id);

      if (deleteError) {
        console.error(`❌ Failed to delete patient ${patient.id}:`, deleteError);
      } else {
        console.log(`✅ Deleted duplicate: ${patient.id}`);
        deletedCount++;
      }
    }

    console.log(`\n🎉 Cleanup complete!`);
    console.log(`   - Total found: ${testPatients.length}`);
    console.log(`   - Deleted: ${deletedCount}`);
    console.log(`   - Remaining: 1`);

    // Step 3: Verify cleanup
    console.log('\n🔍 Step 3: Verifying cleanup...');
    const { data: remainingPatients, error: verifyError } = await supabase
      .from('patients')
      .select('id, unique_id, facility_name')
      .or('facility_name.ilike.%Central Jail Nagpur%,unique_id.ilike.%TEST-CJ-NGP%');

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
    } else {
      console.log(`✅ Verification: ${remainingPatients.length} test patient(s) remaining`);
      remainingPatients.forEach(patient => {
        console.log(`   - ${patient.id}: ${patient.unique_id} at ${patient.facility_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
cleanupDuplicateTestData();
