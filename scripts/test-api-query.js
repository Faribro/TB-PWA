const https = require('https');

const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';

async function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const options = {
      method,
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          const contentRange = res.headers['content-range'];
          const count = contentRange ? parseInt(contentRange.split('/')[1]) : 0;
          resolve({ status: res.statusCode, data: parsed, count });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testAPIQuery() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 TESTING API QUERY PATTERN');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Test 1: Get first 20000 records ordered by screening_date DESC
  console.log('📊 Test 1: First 20000 records (DESC order)');
  console.log('─'.repeat(60));
  
  const result1 = await makeRequest('GET', '/rest/v1/patients?select=screening_date&order=screening_date.desc&limit=20000');
  
  if (result1.data && result1.data.length > 0) {
    const dateMap = new Map();
    result1.data.forEach(r => {
      if (r.screening_date) {
        dateMap.set(r.screening_date, (dateMap.get(r.screening_date) || 0) + 1);
      }
    });
    
    console.log(`Records returned: ${result1.data.length}`);
    console.log(`Unique dates: ${dateMap.size}`);
    console.log(`\nDate distribution:`);
    
    const sortedDates = Array.from(dateMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 15);
    sortedDates.forEach(([date, count]) => {
      console.log(`  ${date}: ${count} records`);
    });
  }
  
  console.log('\n─'.repeat(60));
  
  // Test 2: Check if range() affects the results
  console.log('\n📊 Test 2: Using range(0, 19999) with DESC order');
  console.log('─'.repeat(60));
  
  const result2 = await makeRequest('GET', '/rest/v1/patients?select=screening_date&order=screening_date.desc');
  
  // Manually apply range logic
  const rangedData = result2.data ? result2.data.slice(0, 20000) : [];
  
  if (rangedData.length > 0) {
    const dateMap2 = new Map();
    rangedData.forEach(r => {
      if (r.screening_date) {
        dateMap2.set(r.screening_date, (dateMap2.get(r.screening_date) || 0) + 1);
      }
    });
    
    console.log(`Records returned: ${rangedData.length}`);
    console.log(`Unique dates: ${dateMap2.size}`);
    console.log(`\nDate distribution:`);
    
    const sortedDates2 = Array.from(dateMap2.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 15);
    sortedDates2.forEach(([date, count]) => {
      console.log(`  ${date}: ${count} records`);
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 CONCLUSION');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('If both tests show all dates (Jan, Mar, Apr), the API query is correct.');
  console.log('If only April 6-11 shows, the issue is in the query ordering/range.');
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

testAPIQuery().catch(console.error);
