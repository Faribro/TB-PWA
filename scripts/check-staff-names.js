const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStaffNames() {
  console.log('🔍 Checking distinct staff names in patients table...\n');
  
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('staff_name')
      .not('staff_name', 'is', null)
      .limit(1000);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    // Count occurrences
    const counts = {};
    data.forEach(row => {
      const name = row.staff_name;
      counts[name] = (counts[name] || 0) + 1;
    });
    
    // Sort by count
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    console.log('📊 Top 20 staff names by submission count:\n');
    sorted.forEach(([name, count]) => {
      console.log(`   ${count.toString().padStart(4)} submissions - "${name}"`);
    });
    
    console.log(`\n✅ Total unique staff names: ${Object.keys(counts).length}`);
    console.log(`✅ Total records with staff_name: ${data.length}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkStaffNames();
