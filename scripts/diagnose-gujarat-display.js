/**
 * Gujarat Display Discrepancy Diagnostic
 * Compares database count (1302) vs Vertex display count (1297)
 * Identifies the 5 missing records
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
console.log('🔍 GUJARAT DISPLAY DISCREPANCY DIAGNOSTIC');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('Database count: 1302');
console.log('Vertex display: 1297');
console.log('Missing: 5 records\n');

async function diagnose() {
  try {
    // Query 1: All Gujarat records with key fields
    console.log('📊 Fetching all Gujarat records...');
    const { data: allRecords, error: error1 } = await supabase
      .from('patients')
      .select('id, inmate_name, screening_date, screening_district, facility_name, created_at')
      .eq('screening_state', 'Gujarat')
      .order('created_at', { ascending: false });

    if (error1) {
      console.error('❌ Query failed:', error1.message);
      return;
    }

    console.log(`✅ Fetched ${allRecords.length} records\n`);

    // Check for NULL screening_date (Vertex filters these out)
    console.log('🔍 Checking for NULL screening_date...');
    const nullScreeningDate = allRecords.filter(r => !r.screening_date);
    console.log(`Found ${nullScreeningDate.length} records with NULL screening_date:\n`);
    
    if (nullScreeningDate.length > 0) {
      nullScreeningDate.forEach((r, idx) => {
        console.log(`  ${idx + 1}. ${r.inmate_name || 'NO NAME'}`);
        console.log(`     ID: ${r.id}`);
        console.log(`     District: ${r.screening_district || 'N/A'}`);
        console.log(`     Facility: ${r.facility_name || 'N/A'}`);
        console.log(`     Created: ${new Date(r.created_at).toLocaleString('en-IN')}`);
        console.log('');
      });
    }

    // Check for NULL inmate_name (might be filtered)
    console.log('🔍 Checking for NULL inmate_name...');
    const nullName = allRecords.filter(r => !r.inmate_name || r.inmate_name.trim() === '');
    console.log(`Found ${nullName.length} records with NULL/empty inmate_name\n`);

    // Check for invalid dates (before 2020 or after today)
    console.log('🔍 Checking for invalid screening_date...');
    const today = new Date().toISOString().split('T')[0];
    const invalidDates = allRecords.filter(r => {
      if (!r.screening_date) return false;
      return r.screening_date < '2020-01-01' || r.screening_date > today;
    });
    console.log(`Found ${invalidDates.length} records with invalid screening_date\n`);

    // Check for duplicate IDs (shouldn't happen but worth checking)
    console.log('🔍 Checking for duplicate IDs...');
    const idMap = {};
    const duplicateIds = [];
    allRecords.forEach(r => {
      if (idMap[r.id]) {
        duplicateIds.push(r.id);
      }
      idMap[r.id] = true;
    });
    console.log(`Found ${duplicateIds.length} duplicate IDs\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`Total Gujarat records: ${allRecords.length}`);
    console.log(`NULL screening_date: ${nullScreeningDate.length}`);
    console.log(`NULL inmate_name: ${nullName.length}`);
    console.log(`Invalid screening_date: ${invalidDates.length}`);
    console.log(`Duplicate IDs: ${duplicateIds.length}`);
    console.log('');

    const totalFiltered = nullScreeningDate.length + nullName.length + invalidDates.length + duplicateIds.length;
    console.log(`Total potentially filtered: ${totalFiltered}`);
    console.log(`Expected display count: ${allRecords.length - totalFiltered}`);
    console.log(`Actual display count: 1297`);
    console.log(`Discrepancy: ${Math.abs((allRecords.length - totalFiltered) - 1297)}`);
    console.log('');

    if (nullScreeningDate.length === 5) {
      console.log('✅ DIAGNOSIS: The 5 missing records have NULL screening_date');
      console.log('   Vertex filters out records without screening_date for calendar display');
      console.log('');
      console.log('💡 SOLUTION: Backfill screening_date from created_at or submitted_on');
      console.log('   Run this SQL in Supabase:');
      console.log('');
      console.log('   UPDATE patients');
      console.log('   SET screening_date = DATE(created_at)');
      console.log('   WHERE screening_state = \'Gujarat\'');
      console.log('     AND screening_date IS NULL;');
    } else {
      console.log('⚠️  The discrepancy is not fully explained by NULL screening_date');
      console.log('   Further investigation needed');
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  }
}

diagnose();
