/**
 * Test if Supabase RLS policies are blocking webhook inserts
 */

const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

async function testRLS() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔐 TESTING SUPABASE RLS POLICIES');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Test 1: Direct insert with Service Role Key (should bypass RLS)
  console.log('📝 Test 1: Direct insert with Service Role Key...\n');
  
  const testData = {
    kobo_uuid: `test-rls-${Date.now()}`,
    inmate_name: 'RLS Test Patient',
    facility_name: 'Test Facility',
    screening_date: '2026-04-15',
    screening_state: 'Maharashtra',
    screening_district: 'Thane',
    staff_name: 'Test Staff',
    submitted_on: new Date().toISOString(),
    webhook_received_at: new Date().toISOString(),
    synced_to_sheets: false,
    sheets_sync_attempts: 0,
    created_at: new Date().toISOString()
  };

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/patients`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(testData),
      }
    );

    console.log(`Status: ${res.status} ${res.statusText}`);
    
    if (res.ok) {
      const data = await res.json();
      console.log('✅ Insert successful!');
      console.log('Returned data:', JSON.stringify(data, null, 2));
      
      // Clean up test record
      const deleteRes = await fetch(
        `${SUPABASE_URL}/rest/v1/patients?kobo_uuid=eq.${testData.kobo_uuid}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      
      if (deleteRes.ok) {
        console.log('✅ Test record cleaned up\n');
      }
    } else {
      const errorText = await res.text();
      console.error('❌ Insert failed!');
      console.error('Error:', errorText);
      console.error('\n⚠️  RLS POLICY MIGHT BE BLOCKING INSERTS\n');
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }

  // Test 2: Check RLS policies
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📋 Test 2: Checking RLS policies on patients table...\n');
  
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_policies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ table_name: 'patients' }),
      }
    );

    if (res.ok) {
      const policies = await res.json();
      console.log('RLS Policies:', JSON.stringify(policies, null, 2));
    } else {
      console.log('⚠️  Could not fetch RLS policies (function might not exist)');
    }
  } catch (err) {
    console.log('⚠️  Could not check RLS policies:', err.message);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📝 RECOMMENDATIONS\n');
  console.log('If insert failed:');
  console.log('1. Check Supabase Dashboard → Authentication → Policies');
  console.log('2. Ensure Service Role bypasses RLS (should be automatic)');
  console.log('3. Check if patients table has INSERT policy blocking service role');
  console.log('4. Run: ALTER TABLE patients ENABLE ROW LEVEL SECURITY;');
  console.log('5. Add policy: CREATE POLICY "Service role bypass" ON patients FOR ALL USING (true);');
}

testRLS();
