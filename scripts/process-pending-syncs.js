// ═══════════════════════════════════════════════════════════════════════════
// PROCESS PENDING GOOGLE SHEETS SYNCS
// ═══════════════════════════════════════════════════════════════════════════
// Manually process pending sync jobs from DB fallback queue
// Run: node scripts/process-pending-syncs.js

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;

async function processPendingSyncs() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔄 PROCESSING PENDING GOOGLE SHEETS SYNCS');
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
    // Fetch pending jobs
    console.log('🔍 Fetching pending sync jobs...');
    const { data: jobs, error: fetchError } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(50);
    
    if (fetchError) {
      console.error('❌ Failed to fetch jobs:', fetchError.message);
      return;
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('✅ No pending jobs found');
      return;
    }
    
    console.log(`📊 Found ${jobs.length} pending jobs\n`);
    
    let succeeded = 0;
    let failed = 0;
    
    // Process each job
    for (const job of jobs) {
      console.log(`\n🔄 Processing job ${job.id}...`);
      console.log('  Patient ID:', job.patient_id);
      console.log('  Operation:', job.operation);
      console.log('  Retry Count:', job.retry_count);
      console.log('  Payload fields:', Object.keys(job.payload || {}).length);
      
      // Check if payload has clinical fields
      const clinicalFields = [
        'referral_date', 'referred_facility', 'tb_diagnosed', 'tb_diagnosis_date',
        'tb_type', 'att_start_date', 'hiv_status', 'nikshay_abha_id'
      ];
      
      const hasClinicalFields = clinicalFields.some(field => job.payload?.[field]);
      console.log('  Has clinical fields:', hasClinicalFields ? '✅' : '❌');
      
      if (!hasClinicalFields) {
        console.log('  ⚠️ WARNING: Payload missing clinical fields - skipping');
        console.log('  Available fields:', Object.keys(job.payload || {}).join(', '));
        
        // Mark as failed - needs re-queuing with complete data
        await supabase
          .from('sync_queue')
          .update({ 
            status: 'failed',
            last_error: 'Missing clinical fields - needs re-queue with complete patient data',
          })
          .eq('id', job.id);
        
        failed++;
        continue;
      }
      
      try {
        console.log('  📤 Sending to Google Sheets...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(job.payload),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        const responseText = await response.text();
        console.log('  Response status:', response.status);
        console.log('  Response:', responseText.substring(0, 200));
        
        if (response.ok || response.status === 302) {
          // Mark as completed
          await supabase
            .from('sync_queue')
            .update({ 
              status: 'completed', 
              completed_at: new Date().toISOString() 
            })
            .eq('id', job.id);
          
          succeeded++;
          console.log('  ✅ SUCCESS');
        } else {
          throw new Error(`HTTP ${response.status}: ${responseText}`);
        }
      } catch (error) {
        console.error('  ❌ FAILED:', error.message);
        
        // Increment retry count
        const newRetryCount = job.retry_count + 1;
        await supabase
          .from('sync_queue')
          .update({ 
            retry_count: newRetryCount,
            last_error: error.message,
            status: newRetryCount >= 3 ? 'failed' : 'pending',
          })
          .eq('id', job.id);
        
        failed++;
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 PROCESSING SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('  Total Jobs:', jobs.length);
    console.log('  ✅ Succeeded:', succeeded);
    console.log('  ❌ Failed:', failed);
    console.log('═══════════════════════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('\n❌ Process error:', error.message);
    console.error('  Stack:', error.stack);
  }
}

// Run
processPendingSyncs().catch(console.error);
