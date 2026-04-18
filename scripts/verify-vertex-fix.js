/**
 * Verification script for Vertex calendar February 2026 fix
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function verifyFix() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ VERTEX CALENDAR FIX VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Simulate API call for Mumbai February 2026
  const year = 2026;
  const month = 2;
  const filterState = 'Mumbai';
  
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  console.log('📊 Simulating API call:');
  console.log(`  /api/vertex/metrics?year=${year}&month=${month}&view=month&state=${filterState}`);
  console.log(`  Date range: ${monthStart} to ${monthEnd}\n`);

  let query = supabase
    .from('patients')
    .select('screening_date, tb_diagnosed, xray_result, att_start_date, referral_date, screening_state')
    .gte('screening_date', monthStart)
    .lte('screening_date', monthEnd)
    .not('screening_date', 'is', null)
    .limit(3000);

  if (filterState && filterState !== 'all') {
    query = query.eq('screening_state', filterState);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Query error:', error);
    return;
  }

  console.log(`✅ Query returned ${data.length} records\n`);

  // Aggregate like the API does
  const dailyMap = new Map();
  let totalScreened = 0;
  let totalSuspected = 0;
  let totalDiagnosed = 0;
  let totalAttStarted = 0;
  let totalReferred = 0;

  data.forEach(record => {
    const date = record.screening_date;
    totalScreened++;

    const isSuspected = record.xray_result === 'Suspected TB Case';
    const isDiagnosed = record.tb_diagnosed === 'Y';
    const isAttStarted = record.att_start_date !== null;
    const isReferred = record.referral_date !== null;

    if (isSuspected) totalSuspected++;
    if (isDiagnosed) totalDiagnosed++;
    if (isAttStarted) totalAttStarted++;
    if (isReferred) totalReferred++;

    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        count: 0,
        tbPositive: 0,
        suspected: 0,
        attStarted: 0,
        referred: 0
      });
    }

    const dayStats = dailyMap.get(date);
    dayStats.count++;
    if (isDiagnosed) dayStats.tbPositive++;
    if (isSuspected) dayStats.suspected++;
    if (isAttStarted) dayStats.attStarted++;
    if (isReferred) dayStats.referred++;
  });

  const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) => 
    a.date.localeCompare(b.date)
  );

  console.log('📈 Monthly Totals:');
  console.log(`  Screened: ${totalScreened}`);
  console.log(`  Suspected: ${totalSuspected}`);
  console.log(`  Diagnosed: ${totalDiagnosed}`);
  console.log(`  ATT Started: ${totalAttStarted}`);
  console.log(`  Referred: ${totalReferred}\n`);

  console.log('📅 Daily Breakdown:');
  dailyBreakdown.forEach(day => {
    console.log(`  ${day.date}: ${day.count} screened, ${day.suspected} suspected, ${day.tbPositive} TB+`);
  });

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ VERIFICATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`\n✅ Calendar should show ${dailyBreakdown.length} active days in February 2026`);
  console.log(`✅ Monthly overview should show ${totalScreened} total screenings`);
  console.log(`✅ User should select "Mumbai" state filter (not "Maharashtra")`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

verifyFix().catch(console.error);
