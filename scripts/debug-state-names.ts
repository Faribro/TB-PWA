/**
 * Debug State Name Mismatch
 * Find exact state names in patients table vs profiles table
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugStateNames() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 STATE NAME MISMATCH DEBUG');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Get unique state names from patients table
  const { data: patientStates } = await supabase
    .from('patients')
    .select('screening_state')
    .not('screening_state', 'is', null);

  const uniquePatientStates = [...new Set(patientStates?.map(p => p.screening_state))].sort();

  console.log('📊 Unique states in PATIENTS table (screening_state column):\n');
  uniquePatientStates.forEach((state, i) => {
    console.log(`  ${i + 1}. "${state}"`);
  });

  // Get unique state names from profiles table
  const { data: profileStates } = await supabase
    .from('profiles')
    .select('state')
    .not('state', 'is', null)
    .eq('is_active', true);

  const uniqueProfileStates = [...new Set(profileStates?.map(p => p.state))].sort();

  console.log('\n📊 Unique states in PROFILES table (state column):\n');
  uniqueProfileStates.forEach((state, i) => {
    console.log(`  ${i + 1}. "${state}"`);
  });

  console.log('\n───────────────────────────────────────────────────────────────────────────\n');
  console.log('🔍 MISMATCH ANALYSIS:\n');

  // Check for mismatches
  const problemStates = ['Madhya Pradesh', 'Maharashtra'];
  
  for (const profileState of problemStates) {
    console.log(`\n  Profile state: "${profileState}"`);
    
    // Try exact match
    const { count: exactCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('screening_state', profileState);
    
    console.log(`    Exact match (eq): ${exactCount} records`);
    
    // Try case-insensitive match
    const { count: iLikeCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .ilike('screening_state', profileState);
    
    console.log(`    Case-insensitive (ilike): ${iLikeCount} records`);
    
    // Find similar state names
    const similarStates = uniquePatientStates.filter(s => 
      s.toLowerCase().includes(profileState.toLowerCase().split(' ')[0]) ||
      profileState.toLowerCase().includes(s.toLowerCase())
    );
    
    if (similarStates.length > 0) {
      console.log(`    Similar states found in patients table:`);
      for (const similar of similarStates) {
        const { count } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('screening_state', similar);
        console.log(`      - "${similar}": ${count} records`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════\n');
}

debugStateNames();
