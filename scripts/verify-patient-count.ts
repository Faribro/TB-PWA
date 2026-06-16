/**
 * Verify total patient count in Supabase
 * Run: bun run scripts/verify-patient-count.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyPatientCount() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 PATIENT COUNT VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    // Get total count
    const { count, error } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }

    console.log(`✅ Total records in patients table: ${count}\n`);

    // Test fetching in batches
    console.log('Testing batch fetch (1000 per batch)...\n');
    
    const batchSize = 1000;
    const pages = Math.ceil((count || 0) / batchSize);
    let totalFetched = 0;

    for (let i = 0; i < pages; i++) {
      const { data, error: batchError } = await supabase
        .from('patients')
        .select('id')
        .range(i * batchSize, (i + 1) * batchSize - 1);

      if (batchError) {
        console.error(`❌ Batch ${i + 1}/${pages} error:`, batchError.message);
        continue;
      }

      totalFetched += data?.length || 0;
      console.log(`  Batch ${i + 1}/${pages}: ${data?.length || 0} records`);
    }

    console.log('\n───────────────────────────────────────────────────────────────────────────');
    console.log(`Total fetched: ${totalFetched}`);
    console.log(`Expected:      ${count}`);
    console.log(`Match:         ${totalFetched === count ? '✅ YES' : '❌ NO'}`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

verifyPatientCount();
