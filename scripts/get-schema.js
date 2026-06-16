const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTableSchema() {
  console.log('🔍 Fetching actual patients table schema...\n');
  
  try {
    // Fetch one row to see all columns
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
      console.log('📋 Available columns in patients table:\n');
      columns.forEach(col => {
        console.log(`   - ${col}`);
      });
      console.log(`\n✅ Total columns: ${columns.length}`);
    } else {
      console.log('⚠️  No data in patients table');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

getTableSchema();
