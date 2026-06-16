/**
 * Gujarat Entries Audit Script
 * Checks all Gujarat entries in the database and identifies missing records
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🔍 GUJARAT ENTRIES AUDIT');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`Project: ${SUPABASE_URL}`);
console.log(`State: Gujarat\n`);

async function auditGujaratEntries() {
  try {
    // Query 1: Total Gujarat entries (bypassing RLS)
    console.log('📊 Query 1: Total Gujarat entries in database...');
    const { data: allGujarat, error: error1, count: totalCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .eq('screening_state', 'Gujarat');

    if (error1) {
      console.error('❌ Query 1 failed:', error1.message);
      return;
    }

    console.log(`✅ Total Gujarat entries: ${totalCount}`);
    console.log(`✅ Records fetched: ${allGujarat?.length || 0}\n`);

    // Query 2: Gujarat entries by district
    console.log('📊 Query 2: Gujarat entries by district...');
    const { data: byDistrict, error: error2 } = await supabase
      .from('patients')
      .select('screening_district')
      .eq('screening_state', 'Gujarat');

    if (error2) {
      console.error('❌ Query 2 failed:', error2.message);
      return;
    }

    const districtCounts = {};
    byDistrict?.forEach(row => {
      const district = row.screening_district || 'NULL';
      districtCounts[district] = (districtCounts[district] || 0) + 1;
    });

    console.log('District breakdown:');
    Object.entries(districtCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([district, count]) => {
        console.log(`  ${district}: ${count}`);
      });
    console.log('');

    // Query 3: Check for NULL/empty critical fields
    console.log('📊 Query 3: Checking data quality...');
    const { data: qualityCheck, error: error3 } = await supabase
      .from('patients')
      .select('id, inmate_name, unique_id, kobo_uuid, screening_district, created_at')
      .eq('screening_state', 'Gujarat')
      .order('created_at', { ascending: false });

    if (error3) {
      console.error('❌ Query 3 failed:', error3.message);
      return;
    }

    let missingName = 0;
    let missingUniqueId = 0;
    let missingKoboUuid = 0;
    let missingDistrict = 0;

    qualityCheck?.forEach(row => {
      if (!row.inmate_name || row.inmate_name.trim() === '') missingName++;
      if (!row.unique_id || row.unique_id.trim() === '') missingUniqueId++;
      if (!row.kobo_uuid || row.kobo_uuid.trim() === '') missingKoboUuid++;
      if (!row.screening_district || row.screening_district.trim() === '') missingDistrict++;
    });

    console.log('Data quality issues:');
    console.log(`  Missing inmate_name: ${missingName}`);
    console.log(`  Missing unique_id: ${missingUniqueId}`);
    console.log(`  Missing kobo_uuid: ${missingKoboUuid}`);
    console.log(`  Missing screening_district: ${missingDistrict}\n`);

    // Query 4: Recent entries (last 30 days)
    console.log('📊 Query 4: Recent entries (last 30 days)...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentEntries, error: error4, count: recentCount } = await supabase
      .from('patients')
      .select('id, inmate_name, screening_district, created_at', { count: 'exact' })
      .eq('screening_state', 'Gujarat')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error4) {
      console.error('❌ Query 4 failed:', error4.message);
      return;
    }

    console.log(`✅ Recent entries (last 30 days): ${recentCount}`);
    if (recentEntries && recentEntries.length > 0) {
      console.log('\nMost recent 10 entries:');
      recentEntries.slice(0, 10).forEach((row, idx) => {
        const date = new Date(row.created_at).toLocaleDateString('en-IN');
        console.log(`  ${idx + 1}. ${row.inmate_name || 'NO NAME'} | ${row.screening_district || 'NO DISTRICT'} | ${date}`);
      });
    }
    console.log('');

    // Query 5: Check for duplicates
    console.log('📊 Query 5: Checking for duplicates...');
    const { data: allRecords, error: error5 } = await supabase
      .from('patients')
      .select('id, kobo_uuid, unique_id, inmate_name')
      .eq('screening_state', 'Gujarat');

    if (error5) {
      console.error('❌ Query 5 failed:', error5.message);
      return;
    }

    const koboUuidMap = {};
    const uniqueIdMap = {};
    let duplicateKoboUuid = 0;
    let duplicateUniqueId = 0;

    allRecords?.forEach(row => {
      if (row.kobo_uuid) {
        if (koboUuidMap[row.kobo_uuid]) {
          duplicateKoboUuid++;
          console.log(`  ⚠️  Duplicate kobo_uuid: ${row.kobo_uuid} (${row.inmate_name})`);
        }
        koboUuidMap[row.kobo_uuid] = true;
      }
      if (row.unique_id) {
        if (uniqueIdMap[row.unique_id]) {
          duplicateUniqueId++;
          console.log(`  ⚠️  Duplicate unique_id: ${row.unique_id} (${row.inmate_name})`);
        }
        uniqueIdMap[row.unique_id] = true;
      }
    });

    console.log(`Total duplicate kobo_uuid: ${duplicateKoboUuid}`);
    console.log(`Total duplicate unique_id: ${duplicateUniqueId}\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 AUDIT SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`Total Gujarat entries: ${totalCount}`);
    console.log(`Districts covered: ${Object.keys(districtCounts).length}`);
    console.log(`Recent entries (30d): ${recentCount}`);
    console.log(`Data quality issues: ${missingName + missingUniqueId + missingKoboUuid + missingDistrict}`);
    console.log(`Duplicates found: ${duplicateKoboUuid + duplicateUniqueId}`);
    console.log('');

    if (totalCount === 0) {
      console.log('⚠️  WARNING: No Gujarat entries found in database!');
      console.log('   Possible causes:');
      console.log('   1. Data not yet imported');
      console.log('   2. State name mismatch (check spelling/case)');
      console.log('   3. RLS policies blocking access (using service role key)');
    } else if (missingName > totalCount * 0.1) {
      console.log('⚠️  WARNING: >10% of entries missing inmate_name!');
    }

    console.log('\n✅ Audit complete');

  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

auditGujaratEntries();
