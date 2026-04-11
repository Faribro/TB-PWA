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

async function checkDates() {
  console.log('📊 Analyzing screening dates distribution...\n');
  
  // Get sample of records with dates
  const result = await makeRequest('GET', '/rest/v1/patients?select=screening_date,inmate_name&order=screening_date.desc&limit=100');
  
  if (result.data && Array.isArray(result.data)) {
    const dateMap = new Map();
    const nullDates = result.data.filter(r => !r.screening_date).length;
    
    result.data.forEach(record => {
      if (record.screening_date) {
        const date = record.screening_date;
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      }
    });
    
    console.log(`✅ Sample of ${result.data.length} records analyzed\n`);
    console.log(`📅 Date Distribution (Top 20):`);
    console.log('─'.repeat(60));
    
    const sortedDates = Array.from(dateMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 20);
    
    sortedDates.forEach(([date, count]) => {
      console.log(`${date}: ${count} records`);
    });
    
    console.log('─'.repeat(60));
    console.log(`\n⚠️  Records with NULL screening_date: ${nullDates}`);
    
    // Get date range
    const allDates = Array.from(dateMap.keys()).sort();
    if (allDates.length > 0) {
      console.log(`\n📆 Date Range:`);
      console.log(`   Earliest: ${allDates[0]}`);
      console.log(`   Latest: ${allDates[allDates.length - 1]}`);
    }
  }
}

checkDates().catch(console.error);
