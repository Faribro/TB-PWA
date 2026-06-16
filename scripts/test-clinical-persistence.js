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

async function testClinicalDataPersistence() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 CLINICAL DATA PERSISTENCE TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  
  try {
    // Get a test patient
    const { data: patients, error: fetchError } = await supabase
      .from('patients')
      .select('id, kobo_uuid, inmate_name, referral_date, referred_facility, tb_diagnosed, att_start_date, hiv_status, nikshay_abha_id')
      .limit(1);
    
    if (fetchError || !patients || patients.length === 0) {
      console.error('❌ Could not fetch test patient:', fetchError?.message);
      return;
    }
    
    const testPatient = patients[0];
    console.log('📋 Test Patient:');
    console.log(`   Name: ${testPatient.inmate_name}`);
    console.log(`   ID: ${testPatient.id}`);
    console.log(`   Kobo UUID: ${testPatient.kobo_uuid}\n`);
    
    console.log('📊 BEFORE UPDATE:');
    console.log(`   referral_date: ${testPatient.referral_date || 'null'}`);
    console.log(`   referred_facility: ${testPatient.referred_facility || 'null'}`);
    console.log(`   tb_diagnosed: ${testPatient.tb_diagnosed || 'null'}`);
    console.log(`   att_start_date: ${testPatient.att_start_date || 'null'}`);
    console.log(`   hiv_status: ${testPatient.hiv_status || 'null'}`);
    console.log(`   nikshay_abha_id: ${testPatient.nikshay_abha_id || 'null'}\n`);
    
    // Test update with clinical data
    const testData = {
      referral_date: '2026-05-01',
      referred_facility: 'DMC-Designated microscopy centre',
      tb_diagnosed: 'Y',
      tb_diagnosis_date: '2026-05-05',
      tb_type: 'Pulmonary',
      att_start_date: '2026-05-10',
      hiv_status: 'Negative',
      nikshay_abha_id: 'TEST123456',
      updated_at: new Date().toISOString()
    };
    
    console.log('🔄 Updating patient with clinical data...\n');
    
    const { data: updated, error: updateError } = await supabase
      .from('patients')
      .update(testData)
      .eq('id', testPatient.id)
      .select('*')
      .single();
    
    if (updateError) {
      console.error('❌ Update Error:', updateError.message);
      console.error('   Code:', updateError.code);
      console.error('   Details:', updateError.details);
      return;
    }
    
    console.log('✅ Update successful!\n');
    console.log('📊 AFTER UPDATE:');
    console.log(`   referral_date: ${updated.referral_date || 'null'}`);
    console.log(`   referred_facility: ${updated.referred_facility || 'null'}`);
    console.log(`   tb_diagnosed: ${updated.tb_diagnosed || 'null'}`);
    console.log(`   tb_diagnosis_date: ${updated.tb_diagnosis_date || 'null'}`);
    console.log(`   tb_type: ${updated.tb_type || 'null'}`);
    console.log(`   att_start_date: ${updated.att_start_date || 'null'}`);
    console.log(`   hiv_status: ${updated.hiv_status || 'null'}`);
    console.log(`   nikshay_abha_id: ${updated.nikshay_abha_id || 'null'}\n`);
    
    // Verify persistence by re-fetching
    console.log('🔍 Re-fetching to verify persistence...\n');
    
    const { data: verified, error: verifyError } = await supabase
      .from('patients')
      .select('referral_date, referred_facility, tb_diagnosed, tb_diagnosis_date, tb_type, att_start_date, hiv_status, nikshay_abha_id')
      .eq('id', testPatient.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Verification Error:', verifyError.message);
      return;
    }
    
    console.log('📊 VERIFIED DATA (fresh fetch):');
    console.log(`   referral_date: ${verified.referral_date || 'null'}`);
    console.log(`   referred_facility: ${verified.referred_facility || 'null'}`);
    console.log(`   tb_diagnosed: ${verified.tb_diagnosed || 'null'}`);
    console.log(`   tb_diagnosis_date: ${verified.tb_diagnosis_date || 'null'}`);
    console.log(`   tb_type: ${verified.tb_type || 'null'}`);
    console.log(`   att_start_date: ${verified.att_start_date || 'null'}`);
    console.log(`   hiv_status: ${verified.hiv_status || 'null'}`);
    console.log(`   nikshay_abha_id: ${verified.nikshay_abha_id || 'null'}\n`);
    
    // Check if all fields persisted correctly
    const allFieldsPersisted = 
      verified.referral_date === testData.referral_date &&
      verified.referred_facility === testData.referred_facility &&
      verified.tb_diagnosed === testData.tb_diagnosed &&
      verified.tb_diagnosis_date === testData.tb_diagnosis_date &&
      verified.tb_type === testData.tb_type &&
      verified.att_start_date === testData.att_start_date &&
      verified.hiv_status === testData.hiv_status &&
      verified.nikshay_abha_id === testData.nikshay_abha_id;
    
    if (allFieldsPersisted) {
      console.log('✅ SUCCESS: All clinical fields persisted correctly!\n');
    } else {
      console.log('❌ FAILURE: Some fields did not persist correctly\n');
      console.log('Expected vs Actual:');
      Object.keys(testData).forEach(key => {
        if (key !== 'updated_at' && testData[key] !== verified[key]) {
          console.log(`   ${key}: expected "${testData[key]}", got "${verified[key]}"`);
        }
      });
    }
    
  } catch (err) {
    console.error('❌ Unexpected Error:', err.message);
    console.error(err.stack);
  }
}

testClinicalDataPersistence();
