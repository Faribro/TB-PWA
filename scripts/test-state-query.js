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

async function testStateNormalization() {
  console.log('\n🔍 Testing state normalization query...\n');
  
  // Test 1: Query with exact match "Madhya Pradesh"
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST 1: Query with screening_state = "Madhya Pradesh"');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const { data: test1, error: error1 } = await supabase
    .from('patients')
    .select('screening_date, screening_state')
    .eq('screening_state', 'Madhya Pradesh')
    .gte('screening_date', '2026-04-01')
    .lte('screening_date', '2026-04-30');
  
  if (error1) {
    console.error('❌ Query failed:', error1.message);
  } else {
    console.log(`✅ Found ${test1.length} records with "Madhya Pradesh"`);
    const dates = [...new Set(test1.map(r => r.screening_date))].sort();
    console.log('Dates:', dates.join(', '));
  }
  
  // Test 2: Query with .in() for all variations
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TEST 2: Query with .in() for all Madhya Pradesh variations');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const { data: test2, error: error2 } = await supabase
    .from('patients')
    .select('screening_date, screening_state')
    .in('screening_state', ['Madhya Pradesh', 'madhya_pradesh', 'Madhyapradesh'])
    .gte('screening_date', '2026-04-01')
    .lte('screening_date', '2026-04-30');
  
  if (error2) {
    console.error('❌ Query failed:', error2.message);
  } else {
    console.log(`✅ Found ${test2.length} records with all variations`);
    const dates = [...new Set(test2.map(r => r.screening_date))].sort();
    console.log('Dates:', dates.join(', '));
    
    // Show state distribution
    const stateMap = new Map();
    test2.forEach(r => {
      stateMap.set(r.screening_state, (stateMap.get(r.screening_state) || 0) + 1);
    });
    console.log('\nState distribution:');
    stateMap.forEach((count, state) => {
      console.log(`  ${state}: ${count}`);
    });
  }
  
  // Test 3: Query with case-insensitive like
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TEST 3: Query with case-insensitive ILIKE');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const { data: test3, error: error3 } = await supabase
    .from('patients')
    .select('screening_date, screening_state')
    .ilike('screening_state', '%madhya%pradesh%')
    .gte('screening_date', '2026-04-01')
    .lte('screening_date', '2026-04-30');
  
  if (error3) {
    console.error('❌ Query failed:', error3.message);
  } else {
    console.log(`✅ Found ${test3.length} records with ILIKE`);
    const dates = [...new Set(test3.map(r => r.screening_date))].sort();
    console.log('Dates:', dates.join(', '));
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

testStateNormalization();
