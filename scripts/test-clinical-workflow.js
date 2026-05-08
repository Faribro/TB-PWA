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

async function testClinicalWorkflow() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 CLINICAL WORKFLOW STEP INDICATORS TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  
  try {
    // Get a test patient
    const { data: patients, error: fetchError } = await supabase
      .from('patients')
      .select('id, kobo_uuid, inmate_name')
      .limit(1);
    
    if (fetchError || !patients || patients.length === 0) {
      console.error('❌ Could not fetch test patient:', fetchError?.message);
      return;
    }
    
    const testPatient = patients[0];
    console.log('📋 Test Patient:');
    console.log(`   Name: ${testPatient.inmate_name}`);
    console.log(`   ID: ${testPatient.id}\n`);
    
    // Test each clinical step
    const steps = [
      {
        name: 'Sputum & Referral',
        data: {
          referral_date: '2026-05-01',
          referred_facility: 'DMC-Designated microscopy centre'
        },
        checkFields: ['referral_date', 'referred_facility']
      },
      {
        name: 'Diagnosis',
        data: {
          tb_diagnosed: 'Y',
          tb_diagnosis_date: '2026-05-05',
          tb_type: 'Pulmonary'
        },
        checkFields: ['tb_diagnosed', 'tb_diagnosis_date']
      },
      {
        name: 'Treatment',
        data: {
          att_start_date: '2026-05-10',
          att_completion_date: '2026-11-10'
        },
        checkFields: ['att_start_date']
      },
      {
        name: 'HIV & ART Status',
        data: {
          hiv_status: 'Negative',
          art_status: 'Pre ART',
          art_number: 'ART123456'
        },
        checkFields: ['hiv_status']
      },
      {
        name: 'Nikshay & Registration',
        data: {
          nikshay_abha_id: 'NIKSHAY123456',
          registration_date: '2026-05-15'
        },
        checkFields: ['nikshay_abha_id']
      }
    ];
    
    let allStepsPassed = true;
    
    for (const step of steps) {
      console.log(`\n${'─'.repeat(75)}`);
      console.log(`📝 Testing Step: ${step.name}`);
      console.log(`${'─'.repeat(75)}\n`);
      
      // Update patient with step data
      console.log('🔄 Updating patient...');
      const { data: updated, error: updateError } = await supabase
        .from('patients')
        .update({ ...step.data, updated_at: new Date().toISOString() })
        .eq('id', testPatient.id)
        .select('*')
        .single();
      
      if (updateError) {
        console.error(`❌ Update failed: ${updateError.message}`);
        allStepsPassed = false;
        continue;
      }
      
      console.log('✅ Update successful\n');
      
      // Verify data persisted
      console.log('🔍 Verifying persistence...');
      const { data: verified, error: verifyError } = await supabase
        .from('patients')
        .select(step.checkFields.join(', '))
        .eq('id', testPatient.id)
        .single();
      
      if (verifyError) {
        console.error(`❌ Verification failed: ${verifyError.message}`);
        allStepsPassed = false;
        continue;
      }
      
      // Check if all required fields are present
      const allFieldsPresent = step.checkFields.every(field => {
        const value = verified[field];
        const expected = step.data[field];
        const matches = value === expected;
        
        console.log(`   ${field}: ${value || 'null'} ${matches ? '✅' : '❌'}`);
        return matches;
      });
      
      if (allFieldsPresent) {
        console.log(`\n✅ ${step.name} - PASSED`);
      } else {
        console.log(`\n❌ ${step.name} - FAILED`);
        allStepsPassed = false;
      }
    }
    
    console.log(`\n${'═'.repeat(75)}`);
    console.log('📊 TEST SUMMARY');
    console.log(`${'═'.repeat(75)}\n`);
    
    if (allStepsPassed) {
      console.log('✅ ALL STEPS PASSED - Clinical workflow is working correctly!\n');
      console.log('Expected Frontend Behavior:');
      console.log('  1. ✅ Sputum & Referral indicator should be GREEN');
      console.log('  2. ✅ Diagnosis indicator should be GREEN');
      console.log('  3. ✅ Treatment indicator should be GREEN');
      console.log('  4. ✅ HIV & ART Status indicator should be GREEN');
      console.log('  5. ✅ Nikshay & Registration indicator should be GREEN\n');
      console.log('  6. ✅ All indicators should remain GREEN after closing/reopening drawer');
      console.log('  7. ✅ Forms should prefill with saved data\n');
    } else {
      console.log('❌ SOME STEPS FAILED - Please review errors above\n');
    }
    
    // Final verification - fetch all clinical fields
    console.log('🔍 Final State Verification:\n');
    const { data: finalState } = await supabase
      .from('patients')
      .select('referral_date, referred_facility, tb_diagnosed, tb_diagnosis_date, tb_type, att_start_date, hiv_status, nikshay_abha_id')
      .eq('id', testPatient.id)
      .single();
    
    if (finalState) {
      console.log('📊 Complete Clinical Data:');
      Object.entries(finalState).forEach(([key, value]) => {
        const status = value ? '✅' : '⚠️ ';
        console.log(`   ${key.padEnd(25)} ${status} ${value || 'null'}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Unexpected Error:', err.message);
    console.error(err.stack);
  }
}

testClinicalWorkflow();
