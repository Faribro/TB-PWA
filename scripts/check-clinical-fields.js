const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClinicalFields() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 CLINICAL FIELDS SCHEMA CHECK');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  
  const clinicalFields = [
    'referral_date',
    'referred_facility',
    'tb_diagnosed',
    'tb_diagnosis_date',
    'tb_type',
    'att_start_date',
    'att_completion_date',
    'hiv_status',
    'art_status',
    'art_number',
    'nikshay_abha_id',
    'registration_date',
    'remarks'
  ];
  
  try {
    // Try to select all clinical fields
    const selectQuery = clinicalFields.join(', ');
    const { data, error } = await supabase
      .from('patients')
      .select(`id, inmate_name, ${selectQuery}`)
      .limit(1);
    
    if (error) {
      console.error('❌ Query Error:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      
      // Parse error to identify missing columns
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        const match = error.message.match(/column "([^"]+)" does not exist/);
        if (match) {
          console.log(`\n⚠️  Missing column: ${match[1]}`);
        }
      }
      return;
    }
    
    if (data && data.length > 0) {
      const row = data[0];
      console.log('✅ All clinical fields exist in database!\n');
      console.log('📋 Sample Patient Data:\n');
      console.log(`   Patient: ${row.inmate_name || 'N/A'}`);
      console.log(`   ID: ${row.id}\n`);
      
      console.log('📊 Clinical Fields Status:\n');
      clinicalFields.forEach(field => {
        const value = row[field];
        const status = value ? '✅ HAS DATA' : '⚠️  EMPTY';
        const display = value || 'null';
        console.log(`   ${field.padEnd(25)} ${status.padEnd(15)} = ${display}`);
      });
    } else {
      console.log('⚠️  No patients found in database');
    }
  } catch (err) {
    console.error('❌ Unexpected Error:', err.message);
  }
}

checkClinicalFields();
