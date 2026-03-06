// Quick debug script to check patient data
const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with actual values from .env.local
const supabase = createClient(
  'https://your-project.supabase.co', // Replace with actual URL
  'your-anon-key' // Replace with actual key
);

async function checkPatientData() {
  console.log('This is a template - please check the actual data in Supabase dashboard');
  console.log('Look for these fields in the patients table:');
  console.log('- screening_date');
  console.log('- referral_date');
  console.log('- tb_diagnosed');
  console.log('- att_start_date');
  console.log('- att_completion_date');
  console.log('- treatment_status');
}

checkPatientData();