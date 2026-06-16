const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Normalizes state name to standard format
 */
function normalizeStateName(state) {
  if (!state) return state;
  
  const normalized = state.toLowerCase().replace(/[_\s]+/g, ' ').trim();
  
  // State normalization mappings
  const stateMap = {
    'madhya pradesh': 'Madhya Pradesh',
    'madhyapradesh': 'Madhya Pradesh',
    'uttarakhand': 'Uttarakhand',
    'maharashtra': 'Maharashtra',
    'mumbai': 'Maharashtra', // Mumbai is part of Maharashtra
    'gujarat': 'Gujarat',
    'chandigarh': 'Chandigarh',
  };
  
  return stateMap[normalized] || state;
}

async function normalizeAllStates() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔧 STATE NAME NORMALIZATION SCRIPT');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Step 1: Fetch all unique state values
  console.log('📊 Step 1: Analyzing current state values...\n');
  
  let allPatients = [];
  let offset = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data: batch, error } = await supabase
      .from('patients')
      .select('screening_state')
      .range(offset, offset + batchSize - 1);
    
    if (error) {
      console.error('❌ Failed to fetch patients:', error.message);
      process.exit(1);
    }
    
    if (!batch || batch.length === 0) break;
    
    allPatients = allPatients.concat(batch);
    offset += batchSize;
    
    if (batch.length < batchSize) break;
  }
  
  console.log(`Fetched ${allPatients.length} total records\n`);
  
  const stateMap = new Map();
  allPatients.forEach(p => {
    const state = p.screening_state;
    if (state) {
      stateMap.set(state, (stateMap.get(state) || 0) + 1);
    }
  });
  
  console.log('Current state distribution:');
  Array.from(stateMap.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([state, count]) => {
      const normalized = normalizeStateName(state);
      const needsUpdate = state !== normalized;
      console.log(`  ${state.padEnd(30)} ${count.toString().padStart(5)} records ${needsUpdate ? `→ ${normalized}` : '✓'}`);
    });
  
  // Step 2: Identify states that need normalization
  console.log('\n📋 Step 2: Identifying records to update...\n');
  
  const statesToNormalize = Array.from(stateMap.keys()).filter(state => {
    return state !== normalizeStateName(state);
  });
  
  if (statesToNormalize.length === 0) {
    console.log('✅ All state names are already normalized!');
    console.log('\n═══════════════════════════════════════════════════════════\n');
    return;
  }
  
  console.log(`Found ${statesToNormalize.length} state variations to normalize:`);
  statesToNormalize.forEach(state => {
    console.log(`  "${state}" → "${normalizeStateName(state)}"`);
  });
  
  // Step 3: Confirm before proceeding
  console.log('\n⚠️  WARNING: This will update the database!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 4: Update each state variation
  console.log('🔄 Step 3: Updating records...\n');
  
  let totalUpdated = 0;
  const results = [];
  
  for (const oldState of statesToNormalize) {
    const newState = normalizeStateName(oldState);
    const count = stateMap.get(oldState);
    
    console.log(`Updating "${oldState}" → "${newState}" (${count} records)...`);
    
    const { data, error } = await supabase
      .from('patients')
      .update({ 
        screening_state: newState,
        updated_at: new Date().toISOString()
      })
      .eq('screening_state', oldState)
      .select('id');
    
    if (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      results.push({ oldState, newState, status: 'failed', error: error.message });
    } else {
      const updated = data?.length || 0;
      console.log(`  ✅ Updated ${updated} records`);
      totalUpdated += updated;
      results.push({ oldState, newState, status: 'success', count: updated });
    }
  }
  
  // Step 5: Verify results
  console.log('\n📊 Step 4: Verifying results...\n');
  
  const { data: verifyPatients, error: verifyError } = await supabase
    .from('patients')
    .select('screening_state');
  
  if (verifyError) {
    console.error('❌ Failed to verify:', verifyError.message);
  } else {
    const newStateMap = new Map();
    verifyPatients.forEach(p => {
      const state = p.screening_state;
      if (state) {
        newStateMap.set(state, (newStateMap.get(state) || 0) + 1);
      }
    });
    
    console.log('New state distribution:');
    Array.from(newStateMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([state, count]) => {
        console.log(`  ${state.padEnd(30)} ${count.toString().padStart(5)} records`);
      });
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`Total records updated: ${totalUpdated}`);
  console.log(`Successful updates: ${results.filter(r => r.status === 'success').length}`);
  console.log(`Failed updates: ${results.filter(r => r.status === 'failed').length}`);
  
  if (results.some(r => r.status === 'failed')) {
    console.log('\n❌ Some updates failed:');
    results.filter(r => r.status === 'failed').forEach(r => {
      console.log(`  ${r.oldState} → ${r.newState}: ${r.error}`);
    });
  } else {
    console.log('\n✅ All state names normalized successfully!');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

normalizeAllStates().catch(err => {
  console.error('\n❌ Script failed:', err.message);
  process.exit(1);
});
