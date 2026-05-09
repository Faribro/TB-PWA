// ═══════════════════════════════════════════════════════════════════════════
// RE-QUEUE FAILED SYNCS WITH COMPLETE PATIENT DATA
// ═══════════════════════════════════════════════════════════════════════════
// Fetches complete patient data from Supabase and re-queues failed sync jobs
// Run: node scripts/fix-all-syncs.js

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;

async function fixAllSyncs() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔧 FIX ALL FAILED SYNCS - Re-queue with Complete Patient Data');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  if (!webhookUrl) {
    console.error('❌ Missing GOOGLE_SCRIPT_WEBHOOK_URL');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('📋 Configuration:');
  console.log('  Supabase URL:', supabaseUrl);
  console.log('  Webhook URL:', webhookUrl.substring(0, 50) + '...\n');
  
  try {
    // Step 1: Get all failed/pending jobs with incomplete data
    console.log('🔍 Step 1: Fetching failed/pending sync jobs...');
    const { data: failedJobs, error: fetchError } = await supabase
      .from('sync_queue')
      .select('*')
      .in('status', ['pending', 'failed'])
      .order('created_at', { ascending: true });
    
    if (fetchError) {
      console.error('❌ Failed to fetch jobs:', fetchError.message);
      return;
    }
    
    if (!failedJobs || failedJobs.length === 0) {
      console.log('✅ No failed/pending jobs found');
      return;
    }
    
    console.log(`📊 Found ${failedJobs.length} failed/pending jobs\n`);
    
    // Step 2: Get unique patient IDs
    const patientIds = [...new Set(failedJobs.map(job => job.patient_id))];
    console.log(`👥 Unique patients: ${patientIds.length}\n`);
    
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    
    // Step 3: Process each patient
    for (const patientId of patientIds) {
      console.log(`\n🔄 Processing patient: ${patientId}`);
      
      // Fetch complete patient data from Supabase
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      
      if (patientError || !patient) {
        console.error('  ❌ Failed to fetch patient data:', patientError?.message);
        skipped++;
        continue;
      }
      
      console.log('  ✅ Patient data fetched');
      console.log('  📊 Total fields:', Object.keys(patient).length);
      
      // Check if patient has clinical fields
      const clinicalFields = [
        'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
        'tb_type', 'att_start_date', 'hiv_status', 'nikshay_abha_id'
      ];
      
      const clinicalFieldsPresent = clinicalFields.filter(field => patient[field]);
      console.log('  🏥 Clinical fields present:', clinicalFieldsPresent.length, '/', clinicalFields.length);
      
      if (clinicalFieldsPresent.length === 0) {
        console.log('  ⏭️  Skipping - no clinical data to sync');
        skipped++;
        continue;
      }
      
      // Send directly to Google Sheets with complete patient data
      try {
        console.log('  📤 Sending to Google Sheets...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patient),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        const responseText = await response.text();
        console.log('  📥 Response status:', response.status);
        
        if (response.ok || response.status === 302) {
          // Mark all jobs for this patient as completed
          const { error: updateError } = await supabase
            .from('sync_queue')
            .update({ 
              status: 'completed', 
              completed_at: new Date().toISOString(),
              last_error: null,
            })
            .eq('patient_id', patientId)
            .in('status', ['pending', 'failed']);
          
          if (updateError) {
            console.error('  ⚠️  Failed to update job status:', updateError.message);
          }
          
          succeeded++;
          console.log('  ✅ SUCCESS - All jobs for this patient marked as completed');
        } else {
          throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 100)}`);
        }
      } catch (error) {
        console.error('  ❌ FAILED:', error.message);
        
        // Update jobs with error message
        await supabase
          .from('sync_queue')
          .update({ 
            last_error: `Re-queue failed: ${error.message}`,
            retry_count: 3, // Max retries to prevent further processing
          })
          .eq('patient_id', patientId)
          .in('status', ['pending', 'failed']);
        
        failed++;
      }
      
      // Rate limiting - wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 FIX ALL SYNCS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('  Total Patients:', patientIds.length);
    console.log('  ✅ Succeeded:', succeeded);
    console.log('  ❌ Failed:', failed);
    console.log('  ⏭️  Skipped:', skipped);
    console.log('═══════════════════════════════════════════════════════════════════════════');
    
    if (succeeded > 0) {
      console.log('\n🎉 SUCCESS! Check Google Sheets to verify all clinical fields are populated.');
    }
    
  } catch (error) {
    console.error('\n❌ Process error:', error.message);
    console.error('  Stack:', error.stack);
  }
}

// Run
fixAllSyncs().catch(console.error);
