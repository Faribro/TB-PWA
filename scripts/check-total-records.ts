/**
 * Check total records with different methods
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTotalRecords() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 CHECKING TOTAL RECORDS WITH DIFFERENT METHODS');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Method 1: Count with head: true
  const { count: countHead } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });

  console.log(`Method 1 (count with head:true): ${countHead}`);

  // Method 2: Count without head
  const { count: countNoHead } = await supabase
    .from('patients')
    .select('*', { count: 'exact' });

  console.log(`Method 2 (count without head): ${countNoHead}`);

  // Method 3: Fetch all and count
  const { data: allData } = await supabase
    .from('patients')
    .select('id');

  console.log(`Method 3 (fetch all IDs): ${allData?.length || 0}`);

  // Method 4: Fetch with limit 20000
  const { data: limitedData } = await supabase
    .from('patients')
    .select('id')
    .limit(20000);

  console.log(`Method 4 (limit 20000): ${limitedData?.length || 0}`);

  // Check state distribution
  const { data: stateData } = await supabase
    .from('patients')
    .select('screening_state');

  const stateCounts = new Map<string, number>();
  stateData?.forEach(row => {
    const state = row.screening_state || 'NULL';
    stateCounts.set(state, (stateCounts.get(state) || 0) + 1);
  });

  console.log('\n📊 State Distribution:');
  Array.from(stateCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([state, count]) => {
      console.log(`  ${state}: ${count}`);
    });

  console.log('\n═══════════════════════════════════════════════════════════════════════════\n');
}

checkTotalRecords();
