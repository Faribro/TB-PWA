const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env.local
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;
console.log('Webhook URL:', webhookUrl);

if (!webhookUrl) {
  console.error('Error: GOOGLE_SCRIPT_WEBHOOK_URL is not set.');
  process.exit(1);
}

async function testFetch() {
  console.log('\n--- Testing Fetch Action ---');
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fetch' }),
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data count:', Array.isArray(data) ? data.length : (data.data ? data.data.length : 'Not an array'));
    console.log('Sample data:', Array.isArray(data) ? data.slice(0, 2) : (data.data ? data.data.slice(0, 2) : data));
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

async function testReconcile() {
  console.log('\n--- Testing Batch Reconcile Action ---');
  const testRecord = {
    id: 'test-direct-' + Date.now(),
    kobo_uuid: 'test-direct-' + Date.now(),
    inmate_name: 'Test Inmate Direct',
    screening_date: '2026-06-12',
    facility_name: 'Test Facility',
    xray_result: 'Normal',
    reconciliation_type: 'INSERT',
    raw_uuid: 'raw-test-' + Date.now(),
    details: {
      inmate_name: 'Test Inmate Direct',
      screening_date: '2026-06-12',
      facility_name: 'Test Facility',
      xray_result: 'Normal',
      reconciliation_action: 'APPROVE_NEW'
    }
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'batch_reconcile',
        batch: [testRecord],
        count: 1
      }),
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Reconcile error:', error);
  }
}

async function run() {
  await testFetch();
  await testReconcile();
}

run();
