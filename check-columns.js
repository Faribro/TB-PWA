require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('🔍 Fetching patients table columns...\n');
  
  // Simple method: fetch one record and get its keys
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('✅ Found', columns.length, 'columns:\n');
    console.log(JSON.stringify(columns, null, 2));
    
    console.log('\n📋 For hardcoded schema (copy this):\n');
    console.log('const columns = new Set([');
    columns.forEach((col, i) => {
      console.log(`  '${col}'${i < columns.length - 1 ? ',' : ''}`);
    });
    console.log(']);');
  } else {
    console.log('⚠️ No records found in patients table');
  }
})();
