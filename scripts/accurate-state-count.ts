/**
 * Get accurate patient count by state
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAccurateCount() {
  const { data } = await supabase
    .from('patients')
    .select('screening_state');

  const counts = new Map<string, number>();
  
  data?.forEach(row => {
    const state = row.screening_state || 'NULL';
    counts.set(state, (counts.get(state) || 0) + 1);
  });

  console.log('Accurate patient counts by screening_state:\n');
  Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([state, count]) => {
      console.log(`  ${state}: ${count}`);
    });
  
  console.log(`\nTotal: ${data?.length || 0}`);
}

getAccurateCount();
