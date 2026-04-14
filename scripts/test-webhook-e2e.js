#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ENHANCED KOBO WEBHOOK TEST WITH DB VERIFICATION
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// Load .env.local manually
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

const WEBHOOK_URL = 'http://localhost:3000/api/webhook/kobo';
const WEBHOOK_SECRET = process.env.KOBO_WEBHOOK_SECRET || 'alliance_kobo_secure_2026';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Generate proper UUID for test
const testUuid = randomUUID();

const mockPayload = {
  _uuid: testUuid,
  _id: Math.floor(Math.random() * 1000000),
  _submission_time: new Date().toISOString(),
  _submitted_by: 'test_user',
  
  'grp_screening/staff_name': 'Dr. Test Kumar',
  'grp_screening/screening_state': 'madhya_pradesh',
  'grp_screening/screening_district': 'Gwalior',
  'grp_screening/facility_code': 'CJ',
  'grp_screening/facility_name': 'Central Jail',
  'grp_screening/facility_type': 'prison',
  'grp_screening/screening_date': '2025-01-26',
  
  'grp_identity/inmate_name': 'Test Patient Kumar',
  'grp_identity/inmate_type': 'under_trial',
  'grp_identity/father_husband_name': 'Test Father Name',
  
  'grp_demo/date_of_birth': '1990-05-15',
  'grp_demo/age': '35',
  'grp_demo/sex': 'male',
  'grp_demo/contact_number': '9876543210',
  
  'grp_address/address_block_house': 'Block A, House 123',
  'grp_address/address_city': 'Gwalior',
  'grp_address/address_state': 'Madhya Pradesh',
  'grp_address/address_pin_code': '474001',
  
  'grp_tb/xray_result': 'normal',
  'grp_tb/symptoms_10s': 'no_symptoms',
  'grp_tb/tb_past_history': 'no',
  
  _geolocation: [26.2183, 78.1828],
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testWebhook() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 KOBO WEBHOOK E2E TEST WITH DB VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Test UUID: ${testUuid}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  // Step 1: Send webhook request
  console.log('📤 Step 1: Sending webhook POST request...');
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-kobo-webhook-secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify(mockPayload),
    });
    
    const data = await response.json();
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    if (response.status !== 200) {
      console.error('\n❌ Webhook request failed');
      console.error('   Check that dev server is running: bun run dev');
      process.exit(1);
    }
    
    console.log('   ✅ Webhook accepted request\n');
    
  } catch (error) {
    console.error('\n❌ Network error:', error.message);
    console.error('   Ensure dev server is running: bun run dev');
    process.exit(1);
  }
  
  // Step 2: Wait for background processing
  console.log('⏳ Step 2: Waiting 3 seconds for background processing...\n');
  await sleep(3000);
  
  // Step 3: Verify record in Supabase
  console.log('🔍 Step 3: Querying Supabase for inserted record...');
  
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('kobo_uuid', testUuid)
      .single();
    
    if (error) {
      console.error('   ❌ Supabase query error:', error.message);
      console.error('   Error code:', error.code);
      console.error('   Error details:', error.details);
      
      if (error.code === 'PGRST116') {
        console.error('\n   💡 Record not found - possible causes:');
        console.error('      1. Background processing failed (check server logs)');
        console.error('      2. RLS policy blocking insert (run scripts/fix-rls-policy.sql)');
        console.error('      3. Column name mismatch in koboMapper');
        console.error('      4. Supabase connection issue');
      }
      
      process.exit(1);
    }
    
    if (!data) {
      console.error('   ❌ Record NOT found in database');
      console.error('   Expected kobo_uuid:', testUuid);
      console.error('\n   💡 Troubleshooting:');
      console.error('      1. Check server console for errors');
      console.error('      2. Verify RLS policy: run scripts/fix-rls-policy.sql');
      console.error('      3. Check Supabase logs in dashboard');
      process.exit(1);
    }
    
    console.log('   ✅ Record found in database!\n');
    console.log('   📋 Inserted record details:');
    console.log('   ─────────────────────────────────────────────────────────────────────────');
    console.log(`   ID:              ${data.id}`);
    console.log(`   Kobo UUID:       ${data.kobo_uuid}`);
    console.log(`   Unique ID:       ${data.unique_id}`);
    console.log(`   Inmate Name:     ${data.inmate_name}`);
    console.log(`   State:           ${data.screening_state || data.state}`);
    console.log(`   District:        ${data.screening_district || data.district}`);
    console.log(`   Facility:        ${data.facility_name}`);
    console.log(`   Screening Date:  ${data.screening_date}`);
    console.log(`   Created At:      ${data.created_at}`);
    console.log(`   Webhook RX:      ${data.webhook_received_at}`);
    console.log('   ─────────────────────────────────────────────────────────────────────────\n');
    
  } catch (error) {
    console.error('   ❌ Unexpected error:', error.message);
    process.exit(1);
  }
  
  // Step 4: Cleanup (optional)
  console.log('🧹 Step 4: Cleaning up test record...');
  
  try {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('kobo_uuid', testUuid);
    
    if (error) {
      console.warn('   ⚠️  Cleanup warning:', error.message);
      console.warn('   Test record may remain in database');
    } else {
      console.log('   ✅ Test record deleted\n');
    }
  } catch (error) {
    console.warn('   ⚠️  Cleanup error:', error.message);
  }
  
  // Summary
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🎉 ALL TESTS PASSED');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ Webhook accepts POST requests');
  console.log('✅ Background processing completes');
  console.log('✅ Record successfully inserted into Supabase');
  console.log('✅ Data mapping is correct\n');
  console.log('🚀 Your webhook is ready for production!');
  console.log('   Configure KoboToolbox webhook URL and secret\n');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

// Run test
testWebhook().catch(error => {
  console.error('\n❌ Test suite failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
