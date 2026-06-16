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

async function testPatientFields() {
  console.log('\n🔍 Fetching Daya Ram patient record...\n');
  
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .ilike('inmate_name', '%Daya%Ram%')
    .limit(5);
  
  if (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }
  
  if (!data || data.length === 0) {
    console.log('❌ No patient found with name "Daya Ram"');
    process.exit(1);
  }
  
  const patient = data[0];
  
  console.log('✅ Patient found!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 ALL FIELDS AND VALUES');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Sort fields alphabetically for easier reading
  const sortedFields = Object.keys(patient).sort();
  
  sortedFields.forEach(field => {
    const value = patient[field];
    const displayValue = value === null ? '❌ NULL' : 
                        value === '' ? '⚠️  EMPTY STRING' : 
                        value;
    console.log(`${field.padEnd(30)} = ${displayValue}`);
  });
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

testPatientFields();
