import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testFiltersFix() {
  console.log('Testing filters fix...\n');

  // Test the exact query pattern from the API
  const { data, error } = await supabase
    .from('patients')
    .select('screening_state')
    .not('screening_state', 'is', null)
    .range(0, 999999);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const uniqueStates = Array.from(
    new Set((data || []).map((r: any) => r.screening_state).filter(Boolean))
  ).sort();

  console.log(`✅ Fetched ${data?.length || 0} rows`);
  console.log(`✅ Found ${uniqueStates.length} unique states:\n`);
  uniqueStates.forEach(state => console.log(`   - ${state}`));
}

testFiltersFix();
