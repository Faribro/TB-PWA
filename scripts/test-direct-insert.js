const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

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

async function testDirectInsert() {
  console.log('\n🧪 Testing direct Supabase insert...\n');
  
  const testRecord = {
    kobo_uuid: randomUUID(),
    inmate_name: 'Direct Test Patient',
    screening_state: 'Madhya Pradesh',
    screening_district: 'Gwalior',
    facility_name: 'Central Jail',
    staff_name: 'Test Staff',
    synced_to_sheets: false,
    sheets_sync_attempts: 0,
  };
  
  console.log('📝 Inserting record:', testRecord.kobo_uuid);
  
  const { data, error } = await supabase
    .from('patients')
    .insert(testRecord)
    .select()
    .single();
  
  if (error) {
    console.error('\n❌ Insert failed:', error.message);
    console.error('   Code:', error.code);
    console.error('   Details:', error.details);
    console.error('   Hint:', error.hint);
    
    if (error.code === '42703') {
      console.error('\n   💡 Column does not exist - schema mismatch!');
      console.error('      Check that column names match exactly');
    }
    
    process.exit(1);
  }
  
  console.log('\n✅ Insert successful!');
  console.log('   ID:', data.id);
  console.log('   UUID:', data.kobo_uuid);
  console.log('   Name:', data.inmate_name);
  
  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await supabase.from('patients').delete().eq('id', data.id);
  console.log('   ✅ Test record deleted\n');
}

testDirectInsert();
