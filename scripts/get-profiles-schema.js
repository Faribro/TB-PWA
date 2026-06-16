const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getProfilesSchema() {
  console.log('🔍 Fetching actual profiles table schema...\n');
  
  try {
    // Fetch one row to see all columns
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('📋 Available columns in profiles table:\n');
      columns.forEach(col => {
        const value = data[0][col];
        console.log(`   - ${col}: ${typeof value} = ${JSON.stringify(value)}`);
      });
      console.log(`\n✅ Total columns: ${columns.length}`);
      console.log('\n📊 Sample profile data:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️  No data in profiles table');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

getProfilesSchema();
