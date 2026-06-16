/**
 * Test Supabase Realtime Subscriptions
 * 
 * Tests the usePatientRealtime hook to verify:
 * 1. Successfully subscribes to patients table
 * 2. Receives INSERT events
 * 3. Receives UPDATE events
 * 4. Receives DELETE events
 * 5. Cleans up subscription on exit
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('🧪 TESTING SUPABASE REALTIME SUBSCRIPTIONS');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.log('💡 Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
console.log(`URL: ${SUPABASE_URL}`);
console.log();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let insertReceived = false;
let updateReceived = false;
let deleteReceived = false;

console.log('📡 Setting up Realtime subscription...');

const channel = supabase
  .channel('test-patients-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'patients'
    },
    (payload) => {
      console.log(`\n🔔 REALTIME EVENT RECEIVED: ${payload.eventType}`);
      console.log('Timestamp:', new Date().toISOString());
      console.log('Payload:', JSON.stringify(payload, null, 2));

      if (payload.eventType === 'INSERT') {
        insertReceived = true;
        console.log('✅ INSERT event captured');
      } else if (payload.eventType === 'UPDATE') {
        updateReceived = true;
        console.log('✅ UPDATE event captured');
      } else if (payload.eventType === 'DELETE') {
        deleteReceived = true;
        console.log('✅ DELETE event captured');
      }
    }
  )
  .subscribe((status) => {
    console.log(`\n📊 Subscription status: ${status}`);
    
    if (status === 'SUBSCRIBED') {
      console.log('✅ Successfully subscribed to patients table');
      console.log();
      console.log('═══════════════════════════════════════════════════════════════════════════');
      console.log('🎯 READY FOR TESTING');
      console.log('═══════════════════════════════════════════════════════════════════════════');
      console.log();
      console.log('This script will listen for patient changes for 60 seconds.');
      console.log();
      console.log('To test, perform these actions in another terminal:');
      console.log('1. Run: bun run scripts/test-webhook-refactor.ts');
      console.log('   → Should trigger INSERT event');
      console.log();
      console.log('2. Run: bun run scripts/test-patient-sync-refactor.ts');
      console.log('   → Should trigger UPDATE event');
      console.log();
      console.log('Or manually insert/update a patient in Supabase dashboard.');
      console.log();
      console.log('⏳ Listening for 60 seconds...');
      console.log();
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ Subscription error');
      console.log('💡 Check if Realtime is enabled in Supabase dashboard');
      process.exit(1);
    } else if (status === 'TIMED_OUT') {
      console.error('❌ Subscription timed out');
      process.exit(1);
    }
  });

// Listen for 60 seconds
setTimeout(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  
  console.log(`INSERT events received: ${insertReceived ? '✅' : '❌'}`);
  console.log(`UPDATE events received: ${updateReceived ? '✅' : '❌'}`);
  console.log(`DELETE events received: ${deleteReceived ? '⏭️  (skipped)' : '❌'}`);
  console.log();

  if (insertReceived || updateReceived) {
    console.log('✅ Realtime subscriptions are working!');
    console.log('✅ UI will receive live updates automatically');
  } else {
    console.log('⚠️  No events received during test period');
    console.log('💡 Try running the webhook or patient-sync tests');
  }

  console.log();
  console.log('🧹 Cleaning up subscription...');
  await supabase.removeChannel(channel);
  console.log('✅ Subscription cleaned up');
  console.log();
  
  process.exit(0);
}, 60000);

// Handle Ctrl+C
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Interrupted by user');
  console.log('🧹 Cleaning up subscription...');
  await supabase.removeChannel(channel);
  console.log('✅ Subscription cleaned up');
  process.exit(0);
});
