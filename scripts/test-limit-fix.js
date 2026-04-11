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
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testLimitFix() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 TESTING .limit() FIX');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('📊 Fetching with limit=20000...\n');
  
  const result = await makeRequest('GET', '/rest/v1/patients?select=screening_date&order=screening_date.desc&limit=20000');
  
  if (result.data && result.data.length > 0) {
    const dateMap = new Map();
    result.data.forEach(r => {
      if (r.screening_date) {
        dateMap.set(r.screening_date, (dateMap.get(r.screening_date) || 0) + 1);
      }
    });
    
    console.log(`✅ Records returned: ${result.data.length.toLocaleString()}`);
    console.log(`✅ Unique dates: ${dateMap.size}`);
    console.log(`\n📅 Date distribution (all dates):`);
    console.log('─'.repeat(60));
    
    const sortedDates = Array.from(dateMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    sortedDates.forEach(([date, count]) => {
      console.log(`  ${date}: ${count.toLocaleString()} records`);
    });
    
    console.log('\n─'.repeat(60));
    
    // Check if we have all expected data
    const hasJanuary = sortedDates.some(([date]) => date.startsWith('2026-01'));
    const hasMarch = sortedDates.some(([date]) => date.startsWith('2026-03'));
    const hasApril = sortedDates.some(([date]) => date.startsWith('2026-04'));
    
    console.log('\n📊 Data Coverage:');
    console.log(`  January 2026: ${hasJanuary ? '✅ Present' : '❌ Missing'}`);
    console.log(`  March 2026: ${hasMarch ? '✅ Present' : '❌ Missing'}`);
    console.log(`  April 2026: ${hasApril ? '✅ Present' : '❌ Missing'}`);
    
    if (hasJanuary && hasMarch && hasApril) {
      console.log('\n🎉 SUCCESS! All data is being returned correctly.');
      console.log('   The .limit(20000) fix works!');
    } else {
      console.log('\n⚠️  WARNING: Some months are missing.');
      console.log('   The fix may need adjustment.');
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

testLimitFix().catch(console.error);
