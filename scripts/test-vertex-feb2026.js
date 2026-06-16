/**
 * Test script to diagnose Vertex calendar February 2026 issue
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testFebruary2026() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 VERTEX CALENDAR FEBRUARY 2026 DIAGNOSTIC TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Test 1: Check all February 2026 data
  console.log('📊 TEST 1: All February 2026 Records');
  const { data: allFeb, error: err1 } = await supabase
    .from('patients')
    .select('screening_date, screening_state, screening_district, inmate_name')
    .gte('screening_date', '2026-02-01')
    .lte('screening_date', '2026-02-28')
    .not('screening_date', 'is', null)
    .limit(200);

  if (err1) {
    console.error('❌ Error:', err1);
    return;
  }

  console.log(`✅ Total February 2026 records: ${allFeb.length}`);
  
  // Group by state
  const byState = {};
  const byDate = {};
  allFeb.forEach(r => {
    byState[r.screening_state] = (byState[r.screening_state] || 0) + 1;
    byDate[r.screening_date] = (byDate[r.screening_date] || 0) + 1;
  });

  console.log('\n📍 Records by State:');
  Object.entries(byState).sort((a, b) => b[1] - a[1]).forEach(([state, count]) => {
    console.log(`  ${state}: ${count}`);
  });

  console.log('\n📅 Records by Date (top 10):');
  Object.entries(byDate).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([date, count]) => {
    console.log(`  ${date}: ${count}`);
  });

  // Test 2: Check Maharashtra specifically
  console.log('\n\n📊 TEST 2: Maharashtra February 2026 Records');
  const { data: maharashtra, error: err2 } = await supabase
    .from('patients')
    .select('screening_date, screening_state, screening_district, inmate_name')
    .eq('screening_state', 'Maharashtra')
    .gte('screening_date', '2026-02-01')
    .lte('screening_date', '2026-02-28')
    .not('screening_date', 'is', null);

  if (err2) {
    console.error('❌ Error:', err2);
  } else {
    console.log(`✅ Maharashtra February 2026 records: ${maharashtra.length}`);
    if (maharashtra.length > 0) {
      console.log('Sample records:');
      maharashtra.slice(0, 5).forEach(r => {
        console.log(`  ${r.screening_date} - ${r.inmate_name} (${r.screening_district})`);
      });
    } else {
      console.log('⚠️  No Maharashtra records found in February 2026');
    }
  }

  // Test 3: Check Mumbai specifically
  console.log('\n\n📊 TEST 3: Mumbai February 2026 Records');
  const { data: mumbai, error: err3 } = await supabase
    .from('patients')
    .select('screening_date, screening_state, screening_district, inmate_name')
    .eq('screening_state', 'Mumbai')
    .gte('screening_date', '2026-02-01')
    .lte('screening_date', '2026-02-28')
    .not('screening_date', 'is', null);

  if (err3) {
    console.error('❌ Error:', err3);
  } else {
    console.log(`✅ Mumbai February 2026 records: ${mumbai.length}`);
    if (mumbai.length > 0) {
      console.log('Sample records:');
      mumbai.slice(0, 5).forEach(r => {
        console.log(`  ${r.screening_date} - ${r.inmate_name} (${r.screening_district})`);
      });
    }
  }

  // Test 4: Check all Maharashtra records (any date)
  console.log('\n\n📊 TEST 4: All Maharashtra Records (Latest 10)');
  const { data: allMaharashtra, error: err4 } = await supabase
    .from('patients')
    .select('screening_date, screening_state, screening_district, inmate_name')
    .eq('screening_state', 'Maharashtra')
    .not('screening_date', 'is', null)
    .order('screening_date', { ascending: false })
    .limit(10);

  if (err4) {
    console.error('❌ Error:', err4);
  } else {
    console.log(`✅ Latest Maharashtra records:`);
    allMaharashtra.forEach(r => {
      console.log(`  ${r.screening_date} - ${r.inmate_name} (${r.screening_district})`);
    });
  }

  // Test 5: Check date format issues
  console.log('\n\n📊 TEST 5: Date Format Validation');
  const sampleRecords = allFeb.slice(0, 10);
  console.log('Sample screening_date values:');
  sampleRecords.forEach(r => {
    const dateStr = r.screening_date;
    const isISO = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    console.log(`  ${dateStr} - ${isISO ? '✅ Valid ISO' : '❌ Invalid format'}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📋 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Total February 2026 records: ${allFeb.length}`);
  console.log(`Maharashtra February 2026: ${maharashtra?.length || 0}`);
  console.log(`Mumbai February 2026: ${mumbai?.length || 0}`);
  console.log('\n💡 DIAGNOSIS:');
  if (maharashtra?.length === 0 && mumbai?.length > 0) {
    console.log('⚠️  Issue: February 2026 data exists under "Mumbai" state, not "Maharashtra"');
    console.log('   Solution: User should filter by "Mumbai" instead of "Maharashtra"');
    console.log('   OR: Consider merging Mumbai into Maharashtra in the state mapping');
  } else if (maharashtra?.length > 0) {
    console.log('✅ Maharashtra February 2026 data exists - calendar should display correctly');
  } else {
    console.log('⚠️  No February 2026 data for Maharashtra or Mumbai');
  }
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

testFebruary2026().catch(console.error);
