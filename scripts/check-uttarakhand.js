const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUttarakhand() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 UTTARAKHAND DATA INVESTIGATION');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Check all variations
  const { data: all, error } = await supabase
    .from('patients')
    .select('id, screening_state, screening_district, inmate_name')
    .or('screening_state.ilike.%uttarakhand%,screening_state.ilike.%uttaranchal%');

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('📊 Total Uttarakhand records:', all.length);
  
  // Group by exact state value
  const grouped = {};
  all.forEach(p => {
    const state = p.screening_state || 'NULL';
    grouped[state] = (grouped[state] || 0) + 1;
  });

  console.log('\n📋 Breakdown by state value:');
  Object.entries(grouped).sort((a, b) => b[1] - a[1]).forEach(([state, count]) => {
    console.log(`  "${state}": ${count}`);
  });

  // Check districts
  const districts = {};
  all.forEach(p => {
    const district = p.screening_district || 'NULL';
    districts[district] = (districts[district] || 0) + 1;
  });

  console.log('\n📍 Districts:');
  Object.entries(districts).sort((a, b) => b[1] - a[1]).forEach(([district, count]) => {
    console.log(`  ${district}: ${count}`);
  });

  // Check for NULL or empty states in Uttarakhand districts
  const ukDistricts = ['Dehradun', 'Haridwar', 'Pauri Garhwal', 'Tehri Garhwal', 'Uttarkashi', 'Chamoli', 'Rudraprayag', 'Bageshwar', 'Almora', 'Champawat', 'Nainital', 'Pithoragarh', 'Udham Singh Nagar'];
  
  for (const district of ukDistricts) {
    const { data: districtData, error: distError } = await supabase
      .from('patients')
      .select('id, screening_state, screening_district, inmate_name')
      .ilike('screening_district', `%${district}%`)
      .or('screening_state.is.null,screening_state.eq.,screening_state.neq.Uttarakhand');

    if (!distError && districtData.length > 0) {
      console.log(`\n⚠️  Found ${districtData.length} records in ${district} with incorrect/missing state:`);
      districtData.slice(0, 3).forEach(p => {
        console.log(`  ID: ${p.id}, State: "${p.screening_state}", District: ${p.screening_district}`);
      });
    }
  }
}

checkUttarakhand().catch(console.error);
