/**
 * Test the batch pagination approach for filters
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testBatchFilters() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 TESTING BATCH PAGINATION FOR FILTERS');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const BATCH_SIZE = 1000;
  const MAX_ROWS = 100000;
  const statesSet = new Set<string>();
  const districtsSet = new Set<string>();
  
  let offset = 0;
  let hasMoreData = true;
  let totalRowsProcessed = 0;

  while (hasMoreData && offset < MAX_ROWS) {
    const { data, error } = await supabase
      .from('patients')
      .select('screening_state, screening_district')
      .not('screening_state', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('❌ Error at offset', offset, error);
      break;
    }

    if (!data || data.length === 0) {
      hasMoreData = false;
      break;
    }

    data.forEach((row: any) => {
      if (row.screening_state) statesSet.add(row.screening_state);
      if (row.screening_district) districtsSet.add(row.screening_district);
    });

    totalRowsProcessed += data.length;
    console.log(`Batch ${Math.floor(offset / BATCH_SIZE) + 1}: +${data.length} rows | Total: ${totalRowsProcessed} | States: ${statesSet.size} | Districts: ${districtsSet.size}`);

    if (data.length < BATCH_SIZE) {
      hasMoreData = false;
    } else {
      offset += BATCH_SIZE;
    }
  }

  const availableStates = Array.from(statesSet).sort();
  const availableDistricts = Array.from(districtsSet).sort();

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  console.log(`✅ Total rows processed: ${totalRowsProcessed.toLocaleString()}`);
  console.log(`✅ Unique states found: ${availableStates.length}`);
  console.log(`✅ Unique districts found: ${availableDistricts.length}\n`);
  
  console.log('📍 States:');
  availableStates.forEach(state => console.log(`   - ${state}`));
  
  console.log('\n═══════════════════════════════════════════════════════════════════════════\n');
}

testBatchFilters();
