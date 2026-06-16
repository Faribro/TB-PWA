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

async function getFullDistribution() {
  console.log('📊 Analyzing FULL date distribution across all records...\n');
  
  const dates = ['2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09', '2026-04-10', '2026-04-11'];
  const dateMap = new Map();
  
  for (const date of dates) {
    const result = await makeRequest('GET', `/rest/v1/patients?select=id&screening_date=eq.${date}`);
    if (result.count) {
      dateMap.set(date, result.count);
    }
  }
  
  // Check for null dates
  const nullResult = await makeRequest('GET', '/rest/v1/patients?select=id&screening_date=is.null');
  const nullCount = nullResult.count || 0;
  
  console.log('📅 Complete Date Distribution:');
  console.log('─'.repeat(60));
  
  let total = 0;
  dateMap.forEach((count, date) => {
    console.log(`${date}: ${count.toLocaleString()} records`);
    total += count;
  });
  
  console.log('─'.repeat(60));
  console.log(`Total with dates: ${total.toLocaleString()}`);
  console.log(`NULL dates: ${nullCount.toLocaleString()}`);
  console.log(`Grand Total: ${(total + nullCount).toLocaleString()}`);
  
  // Check if April 11 dominates
  const april11Count = dateMap.get('2026-04-11') || 0;
  const percentage = ((april11Count / total) * 100).toFixed(1);
  
  console.log(`\n🔍 Analysis:`);
  console.log(`   April 11 represents ${percentage}% of all records`);
  
  if (april11Count > total * 0.9) {
    console.log(`\n🚨 ISSUE: ${percentage}% of records are on April 11!`);
    console.log(`   This explains why the vertex dashboard appears to only show April 11.`);
  }
}

getFullDistribution().catch(console.error);
