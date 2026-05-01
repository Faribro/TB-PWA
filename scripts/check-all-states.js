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

async function checkAllStates() {
  console.log('\n🔍 Fetching ALL state values (bypassing RLS)...\n');
  
  // Batch fetch to get all records
  let allRecords = [];
  let offset = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data: batch, error } = await supabase
      .from('patients')
      .select('screening_state')
      .range(offset, offset + batchSize - 1);
    
    if (error) {
      console.error('❌ Query failed:', error.message);
      process.exit(1);
    }
    
    if (!batch || batch.length === 0) break;
    
    allRecords = allRecords.concat(batch);
    offset += batchSize;
    
    console.log(`  Fetched ${allRecords.length} records...`);
    
    if (batch.length < batchSize) break;
  }
  
  console.log(`\n✅ Total fetched: ${allRecords.length} records\n`);
  
  const stateMap = new Map();
  allRecords.forEach(r => {
    const state = r.screening_state;
    if (state) {
      stateMap.set(state, (stateMap.get(state) || 0) + 1);
    }
  });
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 STATE DISTRIBUTION (ALL RECORDS)');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  Array.from(stateMap.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([state, count]) => {
      console.log(`${state.padEnd(30)} ${count.toString().padStart(6)} records`);
    });
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔍 VARIATIONS TO NORMALIZE');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const variations = Array.from(stateMap.keys()).filter(state => {
    return state.includes('_') || 
           (state.toLowerCase() === state && state !== state.charAt(0).toUpperCase() + state.slice(1));
  });
  
  if (variations.length > 0) {
    variations.forEach(state => {
      console.log(`"${state}" (${stateMap.get(state)} records)`);
    });
  } else {
    console.log('✅ No variations found');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

checkAllStates();
