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

async function diagnoseVertex() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 VERTEX DATA DIAGNOSIS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // 1. Check total records
  const totalResult = await makeRequest('GET', '/rest/v1/patients?select=id');
  console.log(`📊 Total Records: ${totalResult.count.toLocaleString()}\n`);
  
  // 2. Check records with screening_date
  const withDateResult = await makeRequest('GET', '/rest/v1/patients?select=id&screening_date=not.is.null');
  console.log(`✅ Records WITH screening_date: ${withDateResult.count.toLocaleString()}`);
  
  // 3. Check records with NULL screening_date
  const nullDateResult = await makeRequest('GET', '/rest/v1/patients?select=id&screening_date=is.null');
  console.log(`❌ Records with NULL screening_date: ${nullDateResult.count.toLocaleString()}\n`);
  
  // 4. Sample records to check column names
  const sampleResult = await makeRequest('GET', '/rest/v1/patients?select=*&limit=3');
  console.log('📋 Sample Record Structure:');
  console.log('─'.repeat(60));
  if (sampleResult.data && sampleResult.data.length > 0) {
    const record = sampleResult.data[0];
    const columns = Object.keys(record);
    console.log(`Total Columns: ${columns.length}\n`);
    
    // Check critical columns for vertex
    const criticalColumns = [
      'id',
      'screening_date',
      'submitted_on',
      'inmate_name',
      'screening_state',
      'screening_district',
      'tb_diagnosed',
      'xray_result',
      'att_start_date',
      'referral_date'
    ];
    
    console.log('Critical Columns for Vertex:');
    criticalColumns.forEach(col => {
      const exists = columns.includes(col);
      const value = record[col];
      console.log(`  ${exists ? '✅' : '❌'} ${col}: ${value !== null && value !== undefined ? JSON.stringify(value).substring(0, 50) : 'NULL'}`);
    });
  }
  
  console.log('\n─'.repeat(60));
  
  // 5. Check date distribution for April 2026
  console.log('\n📅 April 2026 Date Distribution:');
  console.log('─'.repeat(60));
  
  const dates = [];
  for (let day = 1; day <= 30; day++) {
    const date = `2026-04-${String(day).padStart(2, '0')}`;
    const result = await makeRequest('GET', `/rest/v1/patients?select=id&screening_date=eq.${date}`);
    if (result.count > 0) {
      dates.push({ date, count: result.count });
    }
  }
  
  if (dates.length > 0) {
    dates.forEach(({ date, count }) => {
      console.log(`  ${date}: ${count.toLocaleString()} records`);
    });
  } else {
    console.log('  ⚠️  No records found in April 2026');
  }
  
  console.log('\n─'.repeat(60));
  
  // 6. Check if there are records in other months
  console.log('\n🔍 Checking other months in 2026:');
  console.log('─'.repeat(60));
  
  const months = ['01', '02', '03', '05', '06', '07', '08', '09', '10', '11', '12'];
  for (const month of months) {
    const result = await makeRequest('GET', `/rest/v1/patients?select=id&screening_date=gte.2026-${month}-01&screening_date=lt.2026-${month}-31`);
    if (result.count > 0) {
      console.log(`  2026-${month}: ${result.count.toLocaleString()} records`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 DIAGNOSIS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const percentWithDates = ((withDateResult.count / totalResult.count) * 100).toFixed(1);
  console.log(`Total Records: ${totalResult.count.toLocaleString()}`);
  console.log(`Records with dates: ${withDateResult.count.toLocaleString()} (${percentWithDates}%)`);
  console.log(`Records without dates: ${nullDateResult.count.toLocaleString()} (${(100 - percentWithDates).toFixed(1)}%)`);
  
  if (nullDateResult.count > totalResult.count * 0.5) {
    console.log('\n🚨 ISSUE: More than 50% of records have NULL screening_date');
    console.log('   This is why Vertex shows limited data.');
    console.log('   Run the backfill script to populate screening_date from submitted_on.');
  } else if (dates.length === 0) {
    console.log('\n🚨 ISSUE: No records found in April 2026');
    console.log('   Check if data exists in other months or if dates are in wrong format.');
  } else {
    console.log('\n✅ Data distribution looks normal');
    console.log('   If Vertex still shows no data, check:');
    console.log('   1. User role/permissions (RBAC filters)');
    console.log('   2. Frontend date filters');
    console.log('   3. API route query parameters');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

diagnoseVertex().catch(console.error);
