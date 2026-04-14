const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPatientSchema() {
  console.log('🔍 Checking patients table schema...\n');
  
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('id, kobo_uuid, unique_id, inmate_name, screening_date, screening_district, created_at, staff_name')
      .limit(1);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      const row = data[0];
      console.log('📋 Column types:\n');
      Object.entries(row).forEach(([col, val]) => {
        const type = typeof val;
        const jsType = val === null ? 'null' : Array.isArray(val) ? 'array' : type;
        console.log(`   ${col.padEnd(25)} ${jsType.padEnd(10)} = ${JSON.stringify(val)}`);
      });
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkPatientSchema();
