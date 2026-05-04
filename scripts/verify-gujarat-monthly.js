/**
 * Gujarat Monthly Breakdown Verification
 * Verifies the monthly distribution of Gujarat records
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
console.log('📅 GUJARAT MONTHLY BREAKDOWN VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

async function verifyMonthlyBreakdown() {
  try {
    // Fetch ALL Gujarat records with screening_date (no limit)
    console.log('📊 Fetching all Gujarat records (bypassing 1000-row limit)...');
    
    let allRecords = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data: batch, error } = await supabase
        .from('patients')
        .select('id, inmate_name, screening_date, screening_district, created_at')
        .eq('screening_state', 'Gujarat')
        .order('screening_date', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('❌ Query failed:', error.message);
        return;
      }
      
      if (batch && batch.length > 0) {
        allRecords = allRecords.concat(batch);
        console.log(`   Fetched batch ${page + 1}: ${batch.length} records (total: ${allRecords.length})`);
        hasMore = batch.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ Total Gujarat records: ${allRecords.length}\n`);

    // Group by month
    const monthlyBreakdown = {};
    const nullScreeningDate = [];
    
    allRecords.forEach(record => {
      if (!record.screening_date) {
        nullScreeningDate.push(record);
        return;
      }
      
      const date = new Date(record.screening_date + 'T00:00:00');
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyBreakdown[monthKey]) {
        monthlyBreakdown[monthKey] = {
          count: 0,
          records: []
        };
      }
      
      monthlyBreakdown[monthKey].count++;
      monthlyBreakdown[monthKey].records.push(record);
    });

    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyBreakdown).sort();

    console.log('📅 MONTHLY BREAKDOWN:\n');
    
    let totalDisplayed = 0;
    sortedMonths.forEach(monthKey => {
      const [year, month] = monthKey.split('-');
      const monthName = new Date(year, parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const count = monthlyBreakdown[monthKey].count;
      totalDisplayed += count;
      
      console.log(`  ${monthName}: ${count} records`);
    });

    console.log('');
    console.log(`  NULL screening_date: ${nullScreeningDate.length} records`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`Total records in database: ${allRecords.length}`);
    console.log(`Records with valid screening_date: ${totalDisplayed}`);
    console.log(`Records with NULL screening_date: ${nullScreeningDate.length}`);
    console.log('');

    // Verify against expected counts
    console.log('✅ VERIFICATION:');
    console.log(`  April 2026: ${monthlyBreakdown['2026-04']?.count || 0} (Expected: 912)`);
    console.log(`  May 2026: ${monthlyBreakdown['2026-05']?.count || 0} (Expected: 1)`);
    console.log(`  March 2026: ${monthlyBreakdown['2026-03']?.count || 0} (Expected: 306)`);
    console.log(`  February 2026: ${monthlyBreakdown['2026-02']?.count || 0} (Expected: 78)`);
    console.log('');
    
    const expectedTotal = 912 + 1 + 306 + 78;
    console.log(`  Total (Feb-May): ${totalDisplayed} (Expected: ${expectedTotal})`);
    console.log(`  Match: ${totalDisplayed === expectedTotal ? '✅ YES' : '❌ NO'}`);
    console.log('');

    // Show NULL screening_date records if any
    if (nullScreeningDate.length > 0) {
      console.log('⚠️  RECORDS WITH NULL SCREENING_DATE:\n');
      nullScreeningDate.slice(0, 10).forEach((r, idx) => {
        console.log(`  ${idx + 1}. ${r.inmate_name || 'NO NAME'}`);
        console.log(`     ID: ${r.id}`);
        console.log(`     District: ${r.screening_district || 'N/A'}`);
        console.log(`     Created: ${new Date(r.created_at).toLocaleString('en-IN')}`);
        console.log('');
      });
      
      if (nullScreeningDate.length > 10) {
        console.log(`  ... and ${nullScreeningDate.length - 10} more\n`);
      }
    }

    console.log('✅ Verification complete');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyMonthlyBreakdown();
