const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wwcgybgvfulotflitogu.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

async function checkRLS() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔐 RLS POLICY VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Test 1: Service role (bypasses RLS)
  const serviceClient = createClient(supabaseUrl, serviceKey);
  const { data: serviceData, error: serviceError, count: serviceCount } = await serviceClient
    .from('patients')
    .select('*', { count: 'exact', head: true });

  console.log('📊 TEST 1: Service Role Key (bypasses RLS)');
  console.log('  Status:', serviceError ? '❌ ERROR' : '✅ SUCCESS');
  console.log('  Count:', serviceCount);
  if (serviceError) console.log('  Error:', serviceError.message);
  console.log();

  // Test 2: Anon key without auth (should fail with RLS)
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: anonData, error: anonError, count: anonCount } = await anonClient
    .from('patients')
    .select('*', { count: 'exact', head: true });

  console.log('📊 TEST 2: Anon Key WITHOUT Auth (should be blocked by RLS)');
  console.log('  Status:', anonError ? '❌ BLOCKED (Expected)' : '✅ SUCCESS');
  console.log('  Count:', anonCount ?? 0);
  if (anonError) console.log('  Error:', anonError.message);
  console.log();

  // Test 3: Check profiles table
  const { data: profiles, error: profilesError } = await serviceClient
    .from('profiles')
    .select('email, role, state, district')
    .limit(5);

  console.log('📊 TEST 3: Profiles Table (first 5 users)');
  console.log('  Status:', profilesError ? '❌ ERROR' : '✅ SUCCESS');
  if (profiles) {
    profiles.forEach(p => {
      console.log(`  - ${p.email} | Role: ${p.role} | State: ${p.state} | District: ${p.district}`);
    });
  }
  if (profilesError) console.log('  Error:', profilesError.message);
  console.log();

  // Test 4: Check if RLS is enabled
  const { data: rlsStatus } = await serviceClient.rpc('pg_catalog.pg_tables')
    .select('*')
    .eq('tablename', 'patients');

  console.log('📊 TEST 4: RLS Status');
  console.log('  RLS Enabled:', rlsStatus ? 'Unknown (need to check pg_class)' : 'Unknown');
  console.log();

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('💡 DIAGNOSIS:');
  console.log('  - If Test 1 shows count > 0: Data exists in database');
  console.log('  - If Test 2 shows count = 0: RLS is working (blocking unauthenticated access)');
  console.log('  - Frontend needs authenticated session to pass RLS policies');
  console.log('═══════════════════════════════════════════════════════════════════════════');
}

checkRLS().catch(console.error);
