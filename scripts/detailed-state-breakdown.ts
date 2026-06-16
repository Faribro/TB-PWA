/**
 * Detailed state breakdown with actual data fetch
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function detailedStateBreakdown() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 DETAILED STATE BREAKDOWN');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Method 1: Count by state using aggregation
  const { data: countData, error: countError } = await supabase
    .from('patients')
    .select('screening_state')
    .not('screening_state', 'is', null);

  if (countError) {
    console.error('Error:', countError);
    return;
  }

  const stateCounts = new Map<string, number>();
  countData?.forEach(row => {
    const state = row.screening_state;
    stateCounts.set(state, (stateCounts.get(state) || 0) + 1);
  });

  console.log('📊 State Distribution (from actual data fetch):');
  console.log('');
  Array.from(stateCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([state, count]) => {
      console.log(`  ${state.padEnd(25)} : ${count.toLocaleString().padStart(10)} records`);
    });

  const total = Array.from(stateCounts.values()).reduce((a, b) => a + b, 0);
  console.log('  ' + '─'.repeat(40));
  console.log(`  ${'TOTAL'.padEnd(25)} : ${total.toLocaleString().padStart(10)} records`);

  console.log('\n───────────────────────────────────────────────────────────────────────────\n');

  // Method 2: Verify Madhya Pradesh count specifically
  console.log('🔍 Verifying Madhya Pradesh records:\n');

  const { count: mpCount } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('screening_state', 'Madhya Pradesh');

  console.log(`  Count query (head:true): ${mpCount?.toLocaleString()}`);

  // Fetch actual MP records in batches
  const batchSize = 1000;
  const batches = Math.ceil((mpCount || 0) / batchSize);
  let mpData: any[] = [];

  console.log(`  Fetching ${batches} batches...`);

  for (let i = 0; i < batches; i++) {
    const { data, error } = await supabase
      .from('patients')
      .select('id, screening_state')
      .eq('screening_state', 'Madhya Pradesh')
      .range(i * batchSize, (i + 1) * batchSize - 1);

    if (error) {
      console.error(`  Batch ${i + 1} error:`, error);
      continue;
    }

    if (data) {
      mpData.push(...data);
      console.log(`  Batch ${i + 1}/${batches}: ${data.length} records (total: ${mpData.length})`);
    }
  }

  console.log(`\n  ✅ Total MP records fetched: ${mpData.length.toLocaleString()}`);

  console.log('\n═══════════════════════════════════════════════════════════════════════════\n');
}

detailedStateBreakdown();
