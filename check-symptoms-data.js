const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5YmdmdWxvdGZsaXRvZ3UiLCJpYXQiOjE3MzQwMzE0MTQsImV4cCI6MjA0OTYwNzQxNH0.wYJ2zQgJlCuKFYFvLxIFJ0xsBVD6-JJdGOuJ-iMVdgI';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSymptomsData() {
  try {
    console.log('🔍 Checking symptoms data in patients table...\n');
    
    // Check for patients with symptoms_10s data
    const { data: symptoms10s, error: error10s } = await supabase
      .from('patients')
      .select('id, inmate_name, symptoms_10s')
      .not('symptoms_10s', 'is', null)
      .limit(5);
    
    if (error10s) {
      console.error('❌ Error querying symptoms_10s:', error10s);
    } else {
      console.log(`📊 Found ${symptoms10s?.length || 0} patients with symptoms_10s data:`);
      symptoms10s?.forEach(patient => {
        console.log(`  - ${patient.inmate_name}: ${patient.symptoms_10s}`);
      });
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Check for patients with symptoms_present data
    const { data: symptomsPresent, error: errorPresent } = await supabase
      .from('patients')
      .select('id, inmate_name, symptoms_present')
      .not('symptoms_present', 'is', null)
      .limit(5);
    
    if (errorPresent) {
      console.error('❌ Error querying symptoms_present:', errorPresent);
    } else {
      console.log(`📊 Found ${symptomsPresent?.length || 0} patients with symptoms_present data:`);
      symptomsPresent?.forEach(patient => {
        console.log(`  - ${patient.inmate_name}: ${patient.symptoms_present}`);
      });
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Check the specific patient from the debug logs
    const specificPatientId = 'bc244991-52fa-48a2-bb8d-183ebf1eac30';
    const { data: specificPatient, error: specificError } = await supabase
      .from('patients')
      .select('*')
      .eq('kobo_uuid', specificPatientId)
      .single();
    
    if (specificError) {
      console.error('❌ Error querying specific patient:', specificError);
    } else {
      console.log(`🎯 Specific patient data (${specificPatient.inmate_name}):`);
      console.log('  symptoms_10s:', specificPatient.symptoms_10s);
      console.log('  symptoms_present:', specificPatient.symptoms_present);
      
      // Show all fields that contain 'symptom'
      const symptomFields = Object.keys(specificPatient).filter(key => 
        key.toLowerCase().includes('symptom')
      );
      console.log('  All symptom fields:', symptomFields);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkSymptomsData();
