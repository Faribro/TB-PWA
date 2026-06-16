/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HARD DELETION SYNC: Google Sheets → Supabase
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Delete all Supabase records that no longer exist in Google Sheets
 * Use Case: After scrubbing test/blank entries from master Google Sheet
 * 
 * ⚠️  WARNING: This script performs HARD DELETES. Cannot be undone.
 * ⚠️  Always backup your database before running this script.
 * 
 * Usage:
 *   1. Paste your valid UUIDs into VALID_UUIDS array below
 *   2. Run: node scripts/hard-sync-deletions.js
 *   3. Review the deletion plan
 *   4. Confirm to proceed
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ═══════════════════════════════════════════════════════════════════════════
// VALID UUIDs FROM GOOGLE SHEETS
// ═══════════════════════════════════════════════════════════════════════════
// 
// 📋 INSTRUCTIONS:
// Replace this array with your 18,539 valid UUIDs from Google Sheets
// Format: ['uuid1', 'uuid2', 'uuid3', ...]
// 
// Example:
// const VALID_UUIDS = [
//   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
//   'b2c3d4e5-f6a7-8901-bcde-f12345678901',
//   // ... paste all 18,539 UUIDs here
// ];
// 
// ═══════════════════════════════════════════════════════════════════════════

const VALID_UUIDS = [
  // 👇 PASTE YOUR VALID UUIDs HERE 👇
  // Example: 'uuid-1', 'uuid-2', 'uuid-3'
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prompt user for confirmation
 */
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Fetch all unique_id values from Supabase
 */
async function fetchSupabaseUUIDs() {
  console.log('📊 Fetching all unique_id values from Supabase...');
  
  const allRecords = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('patients')
      .select('unique_id')
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`Supabase fetch error: ${error.message}`);
    }

    if (data && data.length > 0) {
      allRecords.push(...data.map(r => r.unique_id).filter(Boolean));
      offset += batchSize;
      
      if (data.length < batchSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return allRecords;
}

/**
 * Find UUIDs to delete (in Supabase but not in Google Sheets)
 */
function findUUIDsToDelete(supabaseUUIDs, validUUIDs) {
  const validSet = new Set(validUUIDs);
  return supabaseUUIDs.filter(uuid => !validSet.has(uuid));
}

/**
 * Delete records from Supabase in batches
 */
async function deleteRecords(uuidsToDelete) {
  const batchSize = 100; // Delete in batches of 100
  const totalBatches = Math.ceil(uuidsToDelete.length / batchSize);
  let deletedCount = 0;

  console.log(`\n🗑️  Deleting ${uuidsToDelete.length} records in ${totalBatches} batches...`);

  for (let i = 0; i < totalBatches; i++) {
    const batch = uuidsToDelete.slice(i * batchSize, (i + 1) * batchSize);
    
    const { error, count } = await supabase
      .from('patients')
      .delete({ count: 'exact' })
      .in('unique_id', batch);

    if (error) {
      console.error(`❌ Error deleting batch ${i + 1}/${totalBatches}:`, error.message);
      throw error;
    }

    deletedCount += batch.length;
    const progress = ((i + 1) / totalBatches * 100).toFixed(1);
    console.log(`   ✅ Batch ${i + 1}/${totalBatches} (${progress}%) - Deleted ${batch.length} records`);
  }

  return deletedCount;
}

/**
 * Display sample records to be deleted
 */
async function displaySampleRecords(uuidsToDelete) {
  const sampleSize = Math.min(10, uuidsToDelete.length);
  const sampleUUIDs = uuidsToDelete.slice(0, sampleSize);

  console.log(`\n📋 Sample records to be deleted (showing ${sampleSize} of ${uuidsToDelete.length}):`);

  const { data, error } = await supabase
    .from('patients')
    .select('unique_id, inmate_name, screening_date, screening_state, screening_district')
    .in('unique_id', sampleUUIDs);

  if (error) {
    console.error('⚠️  Could not fetch sample records:', error.message);
  } else if (data) {
    console.table(data);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔥 HARD DELETION SYNC: Google Sheets → Supabase');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Step 1: Validate input
  console.log('📋 STEP 1: Validating input...\n');
  
  if (!Array.isArray(VALID_UUIDS) || VALID_UUIDS.length === 0) {
    console.error('❌ ERROR: VALID_UUIDS array is empty or invalid');
    console.error('   Please paste your valid UUIDs into the VALID_UUIDS array in this script.');
    process.exit(1);
  }

  console.log(`   ✅ Valid UUIDs from Google Sheets: ${VALID_UUIDS.length.toLocaleString()}`);

  // Step 2: Fetch Supabase UUIDs
  console.log('\n📊 STEP 2: Fetching Supabase records...\n');
  
  let supabaseUUIDs;
  try {
    supabaseUUIDs = await fetchSupabaseUUIDs();
    console.log(`   ✅ Supabase unique_id count: ${supabaseUUIDs.length.toLocaleString()}`);
  } catch (error) {
    console.error('❌ Failed to fetch Supabase records:', error.message);
    process.exit(1);
  }

  // Step 3: Compare and find deletions
  console.log('\n🔍 STEP 3: Comparing datasets...\n');
  
  const uuidsToDelete = findUUIDsToDelete(supabaseUUIDs, VALID_UUIDS);
  
  console.log(`   📊 Analysis Results:`);
  console.log(`      • Google Sheets (valid): ${VALID_UUIDS.length.toLocaleString()}`);
  console.log(`      • Supabase (current):    ${supabaseUUIDs.length.toLocaleString()}`);
  console.log(`      • To be deleted:         ${uuidsToDelete.length.toLocaleString()}`);
  console.log(`      • Will remain:           ${(supabaseUUIDs.length - uuidsToDelete.length).toLocaleString()}`);

  if (uuidsToDelete.length === 0) {
    console.log('\n✅ No records to delete. Supabase is already in sync with Google Sheets.');
    return;
  }

  // Step 4: Display sample records
  console.log('\n📋 STEP 4: Sample records to be deleted...\n');
  await displaySampleRecords(uuidsToDelete);

  // Step 5: Confirmation
  console.log('\n⚠️  STEP 5: CONFIRMATION REQUIRED\n');
  console.log('   ⚠️  WARNING: This action cannot be undone!');
  console.log(`   ⚠️  You are about to DELETE ${uuidsToDelete.length.toLocaleString()} records from Supabase.`);
  console.log('   ⚠️  Make sure you have a database backup before proceeding.\n');

  const confirmed = await askConfirmation('   Type "yes" to proceed with deletion: ');

  if (!confirmed) {
    console.log('\n❌ Deletion cancelled by user.');
    process.exit(0);
  }

  // Step 6: Execute deletion
  console.log('\n🗑️  STEP 6: Executing deletion...\n');
  
  try {
    const deletedCount = await deleteRecords(uuidsToDelete);
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ DELETION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    console.log(`   📊 Summary:`);
    console.log(`      • Records deleted:  ${deletedCount.toLocaleString()}`);
    console.log(`      • Records remaining: ${(supabaseUUIDs.length - deletedCount).toLocaleString()}`);
    console.log(`      • Google Sheets:     ${VALID_UUIDS.length.toLocaleString()}`);
    console.log(`      • Sync status:       ${deletedCount === uuidsToDelete.length ? '✅ SUCCESS' : '⚠️  PARTIAL'}`);
    
    // Step 7: Verify final count
    console.log('\n🔍 STEP 7: Verifying final count...\n');
    
    const { count: finalCount, error: countError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('   ⚠️  Could not verify final count:', countError.message);
    } else {
      console.log(`   ✅ Final Supabase count: ${finalCount?.toLocaleString()}`);
      
      if (finalCount === VALID_UUIDS.length) {
        console.log('   ✅ Perfect sync! Supabase matches Google Sheets.');
      } else {
        const diff = Math.abs(finalCount - VALID_UUIDS.length);
        console.log(`   ⚠️  Difference: ${diff.toLocaleString()} records`);
        console.log('   ℹ️  This may be due to records with NULL unique_id or duplicates.');
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('🎉 HARD SYNC COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('\n❌ Deletion failed:', error.message);
    console.error('   Some records may have been deleted before the error occurred.');
    console.error('   Please verify your database state manually.');
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN SCRIPT
// ═══════════════════════════════════════════════════════════════════════════

main().catch((error) => {
  console.error('\n💥 FATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
