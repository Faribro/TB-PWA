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

async function checkRecords() {
  console.log('🔍 Checking for test records...\n');
  
  const { data, error } = await supabase
    .from('patients')
    .select('id, kobo_uuid, inmate_name, created_at')
    .ilike('kobo_uuid', 'test-%')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('❌ No test records found');
    console.log('   Webhook may not be inserting records\n');
    return;
  }
  
  console.log(`✅ Found ${data.length} test record(s):\n`);
  data.forEach((record, i) => {
    console.log(`${i + 1}. ID: ${record.id}`);
    console.log(`   UUID: ${record.kobo_uuid}`);
    console.log(`   Name: ${record.inmate_name}`);
    console.log(`   Created: ${record.created_at}\n`);
  });
}

checkRecords();
