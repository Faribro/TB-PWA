/**
 * Test Maharashtra-Mumbai state grouping
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testMaharashtraMumbaiGrouping() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 MAHARASHTRA-MUMBAI STATE GROUPING TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Test 1: Query with .in() for Maharashtra + Mumbai (February 2026)
  console.log('📊 TEST 1: Query Maharashtra + Mumbai (February 2026)');
  const { data: grouped, error: err1 } = await supabase
    .from('patients')
    .select('screening_date, screening_state, inmate_name')
    .in('screening_state', ['Maharashtra', 'Mumbai'])
    .gte('screening_date', '2026-02-01')
    .lte('screening_date', '2026-02-28')
    .not('screening_date', 'is', null);

  if (err1) {
    console.error('❌ Error:', err1);
    return;
  }

  console.log(`✅ Total records (Maharashtra + Mumbai): ${grouped.length}`);
  
  const byState = {};
  grouped.forEach(r => {
    byState[r.screening_state] = (byState[r.screening_state] || 0) + 1;
  });

  console.log('\n📍 Breakdown by state:');
  Object.entries(byState).forEach(([state, count]) => {
    console.log(`  ${state}: ${count}`);
  });

  // Test 2: Compare with individual queries
  console.log('\n\n📊 TEST 2: Individual Queries (Verification)');
  
  const { data: maharashtraOnly } = await supabase
    .from('patients')
    .select('screening_date')
    .eq('screening_state', 'Maharashtra')
    .gte('screening_date', '2026-02-01')
    .lte('screening_date', '2026-02-28')
    .not('screening_date', 'is', null);

  const { data: mumbaiOnly } = await supabase
    .from('patients')
    .select('screening_date')
    .eq('screening_state', 'Mumbai')
    .gte('screening_date', '2026-02-01')
    .lte('screening_date', '2026-02-28')
    .not('screening_date', 'is', null);

  console.log(`  Maharashtra only: ${maharashtraOnly?.length || 0}`);
  console.log(`  Mumbai only: ${mumbaiOnly?.length || 0}`);
  console.log(`  Combined: ${(maharashtraOnly?.length || 0) + (mumbaiOnly?.length || 0)}`);
  console.log(`  Grouped query: ${grouped.length}`);
  
  const match = grouped.length === (maharashtraOnly?.length || 0) + (mumbaiOnly?.length || 0);
  console.log(`\n  ${match ? '✅' : '❌'} Counts match: ${match}`);

  // Test 3: Full year test
  console.log('\n\n📊 TEST 3: Full Year 2026 (Maharashtra + Mumbai)');
  
  const { data: fullYear } = await supabase
    .from('patients')
    .select('screening_date, screening_state')
    .in('screening_state', ['Maharashtra', 'Mumbai'])
    .gte('screening_date', '2026-01-01')
    .lte('screening_date', '2026-12-31')
    .not('screening_date', 'is', null);

  console.log(`✅ Total 2026 records (Maharashtra + Mumbai): ${fullYear?.length || 0}`);
  
  const byMonth = {};
  fullYear?.forEach(r => {
    const month = r.screening_date.substring(0, 7); // YYYY-MM
    byMonth[month] = (byMonth[month] || 0) + 1;
  });

  console.log('\n📅 Monthly breakdown:');
  Object.entries(byMonth).sort().forEach(([month, count]) => {
    console.log(`  ${month}: ${count}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('\n💡 EXPECTED BEHAVIOR:');
  console.log('  - Maharashtra SPM login → sees both Maharashtra AND Mumbai data');
  console.log('  - Vertex calendar with Maharashtra filter → shows both states');
  console.log('  - February 2026 calendar → shows 20 Mumbai records + 0 Maharashtra = 20 total');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

testMaharashtraMumbaiGrouping().catch(console.error);
