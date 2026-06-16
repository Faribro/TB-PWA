const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testStateCounts() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 STATE DATA COUNT VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const states = ['Uttarakhand', 'Madhya Pradesh', 'Maharashtra', 'Gujarat'];

  for (const state of states) {
    // Test exact match
    const { data: exactData, error: exactError, count: exactCount } = await supabase
      .from('patients')
      .select('id', { count: 'exact', head: false })
      .eq('screening_state', state);

    if (exactError) {
      console.error(`❌ Error for ${state}:`, exactError.message);
      continue;
    }

    console.log(`📊 ${state}:`);
    console.log(`   Exact match (.eq): ${exactCount} records`);
    console.log(`   Returned: ${exactData?.length || 0} records\n`);
  }

  // Test the normalized filter function logic
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 TESTING NORMALIZED FILTERS');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Test Madhya Pradesh with space
  const { data: mpData, count: mpCount } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: false })
    .eq('screening_state', 'Madhya Pradesh');

  console.log(`Madhya Pradesh (exact): ${mpCount} records`);

  // Test Uttarakhand
  const { data: ukData, count: ukCount } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: false })
    .eq('screening_state', 'Uttarakhand');

  console.log(`Uttarakhand (exact): ${ukCount} records`);

  console.log('\n✅ Verification complete!');
}

testStateCounts().catch(console.error);
