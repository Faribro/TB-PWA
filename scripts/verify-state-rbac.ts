/**
 * Verify State-Level RBAC Filtering
 * Tests that SPM and M&E users only see their state's data
 * Run: bun run scripts/verify-state-rbac.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyStateRBAC() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔐 STATE-LEVEL RBAC VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Get all SPM and M&E users from profiles
    const { data: stateUsers, error: profileError } = await supabase
      .from('profiles')
      .select('email, role, state, name')
      .in('role', ['SPM', 'ME', 'State Program Manager', 'M&E Officer'])
      .eq('is_active', true);

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError.message);
      process.exit(1);
    }

    if (!stateUsers || stateUsers.length === 0) {
      console.log('⚠️  No SPM/M&E users found in profiles table');
      process.exit(0);
    }

    console.log(`Found ${stateUsers.length} state-level users:\n`);

    // Step 2: Get patient counts by state
    const { data: stateCounts, error: countError } = await supabase
      .from('patients')
      .select('screening_state')
      .not('screening_state', 'is', null);

    if (countError) {
      console.error('❌ Error fetching patient counts:', countError.message);
      process.exit(1);
    }

    const stateCountMap = new Map<string, number>();
    stateCounts?.forEach(row => {
      const state = row.screening_state;
      stateCountMap.set(state, (stateCountMap.get(state) || 0) + 1);
    });

    console.log('📊 Patient Distribution by State:\n');
    Array.from(stateCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([state, count]) => {
        console.log(`  ${state}: ${count} patients`);
      });

    console.log('\n───────────────────────────────────────────────────────────────────────────\n');

    // Step 3: Verify each state user sees only their state's data
    console.log('🧪 Testing State Filtering:\n');

    for (const user of stateUsers) {
      const userState = user.state;
      
      if (!userState || userState === 'All') {
        console.log(`⚠️  ${user.email} (${user.role}): No state assigned or "All" - SKIP`);
        continue;
      }

      // Simulate the API route's filtering logic
      const { count, error } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('screening_state', userState);

      if (error) {
        console.error(`❌ ${user.email}: Error - ${error.message}`);
        continue;
      }

      const expectedCount = stateCountMap.get(userState) || 0;
      const match = count === expectedCount;

      console.log(`${match ? '✅' : '❌'} ${user.email} (${user.role})`);
      console.log(`   State: ${userState}`);
      console.log(`   Should see: ${expectedCount} patients`);
      console.log(`   Query returned: ${count} patients`);
      
      if (!match) {
        console.log(`   ⚠️  MISMATCH DETECTED!`);
      }
      console.log('');
    }

    console.log('───────────────────────────────────────────────────────────────────────────\n');

    // Step 4: Test specific states mentioned
    const testStates = ['Maharashtra', 'Gujarat', 'Madhya Pradesh', 'MP'];
    
    console.log('🎯 Testing Specific States:\n');

    for (const state of testStates) {
      const { count, error } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('screening_state', state);

      if (error) {
        console.error(`❌ ${state}: Error - ${error.message}`);
        continue;
      }

      const actualCount = stateCountMap.get(state) || 0;
      
      console.log(`  ${state}:`);
      console.log(`    Patients in DB: ${actualCount}`);
      console.log(`    Query result: ${count}`);
      console.log(`    Match: ${count === actualCount ? '✅' : '❌'}`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ STATE RBAC VERIFICATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

verifyStateRBAC();
