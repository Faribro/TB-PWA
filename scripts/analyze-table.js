const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function analyzeTable() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 COMPLETE PATIENTS TABLE ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Get sample records with ALL columns
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patients?select=*&limit=2`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  
  const data = await res.json();
  
  if (data.length > 0) {
    const allColumns = Object.keys(data[0]);
    
    console.log(`✅ Found ${allColumns.length} columns:\n`);
    allColumns.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📋 SAMPLE DATA (First 2 Records)');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    
    data.forEach((record, idx) => {
      console.log(`\n🔹 Record ${idx + 1}:\n`);
      Object.entries(record).forEach(([key, value]) => {
        const type = typeof value;
        const displayValue = value === null ? 'NULL' : 
                           type === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : 
                           JSON.stringify(value);
        console.log(`  ${key}: ${displayValue} (${type})`);
      });
    });
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('🔍 KEY COLUMNS FOR WEBHOOK MAPPING');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    
    const keyColumns = [
      'kobo_uuid', 'screening_date', 'inmate_name', 'facility_name',
      'art_status', 'art_status_at_referral', 'hiv_status', 'tb_diagnosed',
      'xray_result', 'chest_xray_result', 'symptoms_10s'
    ];
    
    keyColumns.forEach(col => {
      if (allColumns.includes(col)) {
        console.log(`✅ ${col}: EXISTS`);
        console.log(`   Sample: ${data[0][col]}`);
      } else {
        console.log(`❌ ${col}: NOT FOUND`);
      }
    });
  }
}

analyzeTable();
