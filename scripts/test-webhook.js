// Test Google Sheets webhook directly
const https = require('https');

const payload = JSON.stringify({
  batch: [
    {
      kobo_uuid: 'TEST-REAL-DATA-001',
      staff_name: 'Dr. Rajesh Kumar',
      submitted_on: '2026-05-04',
      screening_state: 'Maharashtra',
      screening_district: 'Nagpur',
      facility_name: 'Central Jail Nagpur',
      facility_type: 'Prison',
      screening_date: '2026-05-04',
      unique_id: 'TEST-CJ-NGP-001',
      inmate_name: 'Ramesh Patil',
      inmate_type: 'Convicted',
      father_husband_name: 'Shankar Patil',
      date_of_birth: '1985-03-15',
      age: 41,
      sex: 'Male',
      contact_number: '9876543210',
      address: 'Village Kamptee, Nagpur, Maharashtra',
      xray_result: 'Suspected TB Case',
      symptoms_10s: 'Cough of any duration, Fever',
      tb_past_history: 'No'
    }
  ],
  batch_id: 'test-' + Date.now(),
  count: 1
});

const url = 'https://script.google.com/macros/s/AKfycbyBwLUKiFDY-eLdNOIzNZRsyem0rWiTA6IvelapBjHg8sGdtkTuhQs2hGbXrydeUZSu/exec';

console.log('Testing Google Sheets webhook...');
console.log('URL:', url);
console.log('Payload size:', payload.length, 'bytes');
console.log('Fields:', Object.keys(JSON.parse(payload)).length);
console.log('');

const urlObj = new URL(url);
const options = {
  hostname: urlObj.hostname,
  path: urlObj.pathname + urlObj.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('');
    console.log('Response body:');
    console.log(data);
    
    if (res.statusCode === 302 || res.statusCode === 200) {
      console.log('');
      console.log('✅ Webhook responded successfully');
      console.log('Check Google Sheets for the data');
    } else {
      console.log('');
      console.log('⚠️ Unexpected status code');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(payload);
req.end();
