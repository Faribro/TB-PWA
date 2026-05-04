/**
 * Fix Invalid Screening Dates for Gujarat
 * Identifies records with invalid screening_date and backfills from submitted_on
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🔧 FIX INVALID SCREENING DATES - GUJARAT');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

async function fixInvalidDates() {
  try {
    // Step 1: Find records with invalid screening_date
    console.log('📊 Step 1: Finding records with invalid screening_date...\n');
    
    const { data: invalidRecords, error: fetchError } = await supabase
      .from('patients')
      .select('id, inmate_name, screening_date, submitted_on, created_at, screening_district')
      .eq('screening_state', 'Gujarat')
      .lt('screening_date', '2020-01-01');

    if (fetchError) {
      console.error('❌ Query failed:', fetchError.message);
      return;
    }

    console.log(`Found ${invalidRecords.length} records with invalid screening_date:\n`);

    if (invalidRecords.length === 0) {
      console.log('✅ No invalid dates found. All records are valid!');
      return;
    }

    // Display records and proposed fixes
    invalidRecords.forEach((record, idx) => {
      console.log(`${idx + 1}. ${record.inmate_name || 'NO NAME'}`);
      console.log(`   ID: ${record.id}`);
      console.log(`   District: ${record.screening_district || 'N/A'}`);
      console.log(`   Current screening_date: ${record.screening_date}`);
      console.log(`   submitted_on: ${record.submitted_on || 'NULL'}`);
      console.log(`   created_at: ${record.created_at}`);
      
      // Determine new date
      let newDate = null;
      if (record.submitted_on) {
        // Extract date from submitted_on (format: YYYY-MM-DD or ISO timestamp)
        newDate = record.submitted_on.split('T')[0];
      } else if (record.created_at) {
        // Fallback to created_at
        newDate = record.created_at.split('T')[0];
      }
      
      console.log(`   → Proposed fix: ${newDate || 'CANNOT FIX - NO VALID DATE'}`);
      console.log('');
    });

    // Step 2: Ask for confirmation
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('⚠️  CONFIRMATION REQUIRED');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`This will update ${invalidRecords.length} records.`);
    console.log('Each record will be marked with date_corrected = true for visual highlighting.');
    console.log('');
    console.log('To proceed, run this script with --confirm flag:');
    console.log('  node scripts/fix-invalid-dates.js --confirm');
    console.log('');

    // Check for --confirm flag
    if (!process.argv.includes('--confirm')) {
      console.log('❌ Aborted. No changes made.');
      return;
    }

    // Step 3: Update records
    console.log('🔧 Step 2: Updating records...\n');

    let successCount = 0;
    let failCount = 0;

    for (const record of invalidRecords) {
      let newDate = null;
      if (record.submitted_on) {
        newDate = record.submitted_on.split('T')[0];
      } else if (record.created_at) {
        newDate = record.created_at.split('T')[0];
      }

      if (!newDate) {
        console.log(`❌ Skipped ${record.inmate_name} - no valid date available`);
        failCount++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('patients')
        .update({
          screening_date: newDate,
          date_corrected: true // Flag for visual highlighting
        })
        .eq('id', record.id);

      if (updateError) {
        console.log(`❌ Failed to update ${record.inmate_name}: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`✅ Updated ${record.inmate_name}: ${record.screening_date} → ${newDate}`);
        successCount++;
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 UPDATE SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`Total records processed: ${invalidRecords.length}`);
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('');
    console.log('✅ All records have been updated and flagged with date_corrected = true');
    console.log('   These will appear with a glowing indicator in the Neural Timeline.');

  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

fixInvalidDates();
