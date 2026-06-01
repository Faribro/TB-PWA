import { getSupabaseClient } from '../lib/supabase-server';

async function main() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('unique_id', 'UKNACJ75753')
    .maybeSingle();

  if (error) {
    console.error('Error fetching patient:', error);
    process.exit(1);
  }

  console.log('Patient data:', JSON.stringify(data, null, 2));
  
  if (data) {
    console.log('\n🔍 Clinical fields found:');
    console.log('  referral_date:', data.referral_date);
    console.log('  referred_facility:', data.referred_facility);
    console.log('  tb_diagnosed:', data.tb_diagnosed);
    console.log('  tb_diagnosis_date:', data.tb_diagnosis_date);
    console.log('  att_start_date:', data.att_start_date);
    console.log('  hiv_status:', data.hiv_status);
    console.log('  other_facility_name:', data.other_facility_name);
    console.log('  treatment_regimen:', data.treatment_regimen);
  }
}

main();
