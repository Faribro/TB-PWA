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

async function checkAllDates() {
  console.log('📊 Fetching ALL unique screening dates...\n');
  
  // Get distinct screening dates
  const result = await makeRequest('GET', '/rest/v1/patients?select=screening_date&limit=20000');
  
  if (result.data && Array.isArray(result.data)) {
    const uniqueDates = new Set();
    let nullCount = 0;
    
    result.data.forEach(record => {
      if (record.screening_date) {
        uniqueDates.add(record.screening_date);
      } else {
        nullCount++;
      }
    });
    
    console.log(`✅ Analyzed ${result.data.length} records\n`);
    console.log(`📅 Unique Screening Dates Found: ${uniqueDates.size}`);
    console.log('─'.repeat(60));
    
    if (uniqueDates.size > 0) {
      const sortedDates = Array.from(uniqueDates).sort();
      sortedDates.forEach(date => {
        console.log(`   ${date}`);
      });
    }
    
    console.log('─'.repeat(60));
    console.log(`\n⚠️  Records with NULL screening_date: ${nullCount}`);
    console.log(`✅ Records with valid dates: ${result.data.length - nullCount}`);
    
    if (uniqueDates.size === 1) {
      console.log(`\n🚨 ISSUE FOUND: All records have the SAME screening date!`);
      console.log(`   This is why the vertex dashboard only shows one day of data.`);
    }
  }
}

checkAllDates().catch(console.error);
