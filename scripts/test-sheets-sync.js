const WEBHOOK_SECRET = 'alliance_kobo_secure_2026';
const API_URL = 'https://hhxr-tb-engine.vercel.app/api/sync/sheets-to-supabase';

const testPayload = [{
  kobo_uuid: 'test-uuid-001',
  unique_id: 'MPTEST001',
  staff_name: 'Test Staff',
  submission_time: '2025-01-22T10:00:00+05:30',
  state: 'Madhya Pradesh',
  district: 'Bhopal',
  facility_name: 'Central Jail',
  facility_type: 'Prison',
  screening_date: '22/01/2025',
  inmate_name: 'Test Patient',
  age: 35,
  sex: 'Male',
}];

async function testHealthCheck() {
  console.log('\n🏥 TEST 1: Health Check\n');
  const response = await fetch(API_URL);
  const data = await response.json();
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(data, null, 2));
  return response.ok && data.status === 'ok';
}

async function testBatch(size) {
  console.log(`\n📦 TEST: Batch ${size} records\n`);
  const batch = Array.from({length: size}, (_, i) => ({
    ...testPayload[0],
    kobo_uuid: `test-uuid-${String(i).padStart(3, '0')}`,
  }));
  
  const start = Date.now();
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-kobo-webhook-secret': WEBHOOK_SECRET,
    },
    body: JSON.stringify(batch),
  });
  const elapsed = Date.now() - start;
  const data = await response.json();
  
  console.log(`Status: ${response.status} (${elapsed}ms)`);
  console.log('Response:', JSON.stringify(data, null, 2));
  return {success: response.ok, duration: elapsed};
}

async function run() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║          SHEETS → SUPABASE SYNC TEST SUITE                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  const health = await testHealthCheck();
  if (!health) {
    console.log('\n❌ Health check failed. Aborting.');
    return;
  }
  
  const b10 = await testBatch(10);
  const b50 = await testBatch(50);
  const b100 = await testBatch(100);
  const b250 = await testBatch(250);
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY\n');
  console.log(`${health ? '✅' : '❌'} Health Check`);
  console.log(`${b10.success ? '✅' : '❌'} Batch 10 (${b10.duration}ms)`);
  console.log(`${b50.success ? '✅' : '❌'} Batch 50 (${b50.duration}ms)`);
  console.log(`${b100.success ? '✅' : '❌'} Batch 100 (${b100.duration}ms)`);
  console.log(`${b250.success ? '✅' : '❌'} Batch 250 (${b250.duration}ms)`);
  
  if (b250.success) {
    console.log('\n🎉 Recommended: Use 250 records/batch');
  } else if (b100.success) {
    console.log('\n✅ Recommended: Use 100 records/batch');
  } else if (b50.success) {
    console.log('\n⚠️  Recommended: Use 50 records/batch');
  }
}

run().catch(console.error);
