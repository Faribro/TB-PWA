/**
 * CHECK SYNC_QUEUE FOR RECENT UPDATES
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSyncQueue() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 CHECKING SYNC_QUEUE FOR RECENT UPDATES');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const UNIQUE_ID = 'UKNACJ75754';
  const PATIENT_ID = '1e2e1d17-f48e-4ee4-b31c-bab64d67ec11';

  // Get all sync_queue entries for this patient
  const { data: queueEntries, error } = await supabase
    .from('sync_queue')
    .select('*')
    .eq('patient_id', PATIENT_ID)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!queueEntries || queueEntries.length === 0) {
    console.log('⚪ No sync_queue entries found for this patient');
    console.log('\n🔍 This means:');
    console.log('   - Updates are going directly to patients table');
    console.log('   - NOT using sync_queue');
    console.log('   - Check patient-sync API to see where it writes\n');
    return;
  }

  console.log(`✅ Found ${queueEntries.length} sync_queue entries:\n`);

  queueEntries.forEach((entry, idx) => {
    console.log(`${idx + 1}. Queue Entry`);
    console.log(`   ID: ${entry.id}`);
    console.log(`   Status: ${entry.status}`);
    console.log(`   Operation: ${entry.operation}`);
    console.log(`   Created: ${entry.created_at}`);
    console.log(`   Completed: ${entry.completed_at || '(pending)'}`);
    console.log(`   Retry Count: ${entry.retry_count}`);
    
    if (entry.payload) {
      console.log(`   Payload keys: ${Object.keys(entry.payload).length} fields`);
      
      // Check for clinical fields
      const clinicalFields = {
        'referral_date': entry.payload.referral_date,
        'referred_facility': entry.payload.referred_facility,
        'tb_diagnosed': entry.payload.tb_diagnosed,
        'tb_diagnosis_date': entry.payload.tb_diagnosis_date,
        'hiv_status': entry.payload.hiv_status,
        'att_start_date': entry.payload.att_start_date,
        'updated_at': entry.payload.updated_at
      };
      
      const hasClinical = Object.values(clinicalFields).some(v => v !== undefined);
      
      if (hasClinical) {
        console.log('   Clinical fields in payload:');
        Object.entries(clinicalFields).forEach(([key, value]) => {
          if (value !== undefined) {
            console.log(`     - ${key}: ${value}`);
          }
        });
      }
    }
    
    if (entry.last_error) {
      console.log(`   ❌ Error: ${entry.last_error}`);
    }
    console.log('');
  });

  // Check for very recent entries (last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const recentEntries = queueEntries.filter(e => e.created_at > fiveMinutesAgo);

  if (recentEntries.length > 0) {
    console.log(`\n⚡ ${recentEntries.length} entries created in last 5 minutes:`);
    recentEntries.forEach(entry => {
      console.log(`   - ${entry.operation} (${entry.status}) at ${entry.created_at}`);
      if (entry.payload?.referred_facility) {
        console.log(`     referred_facility: ${entry.payload.referred_facility}`);
      }
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════\n');
}

checkSyncQueue().catch(console.error);
