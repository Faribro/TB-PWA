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

async function checkAprilData() {
  console.log('\n🔍 Checking April 2026 data distribution...\n');
  
  // Fetch all April records
  const { data, error } = await supabase
    .from('patients')
    .select('screening_date, screening_state, screening_district, inmate_name')
    .gte('screening_date', '2026-04-01')
    .lte('screening_date', '2026-04-30')
    .order('screening_date', { ascending: true });
  
  if (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }
  
  console.log(`✅ Found ${data.length} records in April 2026\n`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 DATE DISTRIBUTION');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Group by date
  const dateMap = new Map();
  data.forEach(record => {
    const date = record.screening_date;
    if (!dateMap.has(date)) {
      dateMap.set(date, []);
    }
    dateMap.get(date).push(record);
  });
  
  // Sort dates
  const sortedDates = Array.from(dateMap.keys()).sort();
  
  sortedDates.forEach(date => {
    const records = dateMap.get(date);
    console.log(`${date}: ${records.length} records`);
    
    // Show state distribution for this date
    const stateMap = new Map();
    records.forEach(r => {
      const state = r.screening_state || 'NULL';
      stateMap.set(state, (stateMap.get(state) || 0) + 1);
    });
    
    stateMap.forEach((count, state) => {
      console.log(`  └─ ${state}: ${count}`);
    });
    console.log('');
  });
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 STATE DISTRIBUTION (ALL APRIL)');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const stateMap = new Map();
  data.forEach(record => {
    const state = record.screening_state || 'NULL';
    stateMap.set(state, (stateMap.get(state) || 0) + 1);
  });
  
  Array.from(stateMap.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([state, count]) => {
      console.log(`${state.padEnd(30)} ${count} records`);
    });
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📋 SAMPLE RECORDS FROM MISSING DATES');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Check if there are dates between 1st and 15th
  const earlyApril = data.filter(r => r.screening_date >= '2026-04-01' && r.screening_date < '2026-04-15');
  
  if (earlyApril.length > 0) {
    console.log(`Found ${earlyApril.length} records between April 1-14:\n`);
    earlyApril.slice(0, 5).forEach(r => {
      console.log(`  Date: ${r.screening_date}`);
      console.log(`  Name: ${r.inmate_name}`);
      console.log(`  State: ${r.screening_state}`);
      console.log(`  District: ${r.screening_district}`);
      console.log('');
    });
  } else {
    console.log('❌ NO records found between April 1-14');
  }
  
  console.log('═══════════════════════════════════════════════════════════\n');
}

checkAprilData();
