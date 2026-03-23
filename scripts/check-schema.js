const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wwcgybgvfulotflitogu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M'
);

async function checkSchema() {
  console.log('🔍 Checking Supabase patients table schema...\n');
  
  // Try to get one row to see actual columns
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('✅ Available columns in patients table:');
    console.log('─'.repeat(80));
    Object.keys(data[0]).sort().forEach((col, i) => {
      console.log(`${(i + 1).toString().padStart(3)}. ${col}`);
    });
  } else {
    console.log('⚠️ No data in patients table');
  }
}

checkSchema();
