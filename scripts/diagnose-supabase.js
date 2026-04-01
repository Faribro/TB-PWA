/**
 * Diagnostic Script: Check Patients Table for January Data
 * Run: node scripts/diagnose-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function diagnose() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 SUPABASE PATIENTS TABLE DIAGNOSTIC');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // 1. Total count
  console.log('📊 1. TOTAL PATIENT COUNT');
  const { count: totalCount, error: totalError } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });
  
  if (totalError) {
    console.error('❌ Error:', totalError.message);
  } else {
    console.log(`✅ Total patients: ${totalCount}\n`);
  }

  // 2. January 2025 count
  console.log('📅 2. JANUARY 2025 DATA');
  const { count: janCount, error: janError } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .gte('screening_date', '2025-01-01')
    .lt('screening_date', '2025-02-01');
  
  if (janError) {
    console.error('❌ Error:', janError.message);
  } else {
    console.log(`✅ January 2025 patients: ${janCount}\n`);
  }

  // 3. Date range
  console.log('📆 3. DATE RANGE IN DATABASE');
  const { data: dateRange, error: dateError } = await supabase
    .from('patients')
    .select('screening_date')
    .order('screening_date', { ascending: true })
    .limit(1);
  
  const { data: dateRangeMax, error: dateErrorMax } = await supabase
    .from('patients')
    .select('screening_date')
    .order('screening_date', { ascending: false })
    .limit(1);
  
  if (dateError || dateErrorMax) {
    console.error('❌ Error:', dateError?.message || dateErrorMax?.message);
  } else {
    console.log(`✅ Earliest: ${dateRange?.[0]?.screening_date || 'N/A'}`);
    console.log(`✅ Latest: ${dateRangeMax?.[0]?.screening_date || 'N/A'}\n`);
  }

  // 4. Data quality filter impact
  console.log('🔍 4. DATA QUALITY FILTER IMPACT');
  const { count: withUnknown } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });
  
  const { count: withoutUnknown } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .neq('facility_name', 'Unknown')
    .neq('facility_type', 'Unknown');
  
  console.log(`✅ With Unknown facilities: ${withUnknown}`);
  console.log(`✅ Without Unknown facilities: ${withoutUnknown}`);
  console.log(`⚠️  Filtered out: ${withUnknown - withoutUnknown}\n`);

  // 5. Sample recent records
  console.log('📋 5. SAMPLE RECENT RECORDS (Last 10)');
  const { data: samples, error: sampleError } = await supabase
    .from('patients')
    .select('id, inmate_name, screening_date, screening_state, screening_district, facility_name, facility_type')
    .order('screening_date', { ascending: false })
    .limit(10);
  
  if (sampleError) {
    console.error('❌ Error:', sampleError.message);
  } else {
    console.table(samples);
  }

  // 6. Check RLS policies (requires direct SQL)
  console.log('\n🔐 6. RLS POLICIES CHECK');
  const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
    sql: `SELECT policyname, roles::text[], cmd FROM pg_policies WHERE tablename = 'patients' ORDER BY policyname`
  }).catch(() => ({ data: null, error: { message: 'RPC not available - check manually in SQL Editor' } }));
  
  if (policyError || !policies) {
    console.log('⚠️  Cannot check policies via RPC');
    console.log('   Run this in SQL Editor:');
    console.log('   SELECT policyname, roles::text[], cmd FROM pg_policies WHERE tablename = \'patients\';\n');
  } else {
    console.table(policies);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ DIAGNOSTIC COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════════════');
}

diagnose().catch(console.error);
