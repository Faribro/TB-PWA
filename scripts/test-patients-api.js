const https = require('https');

async function testPatientsAPI() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 TESTING /api/patients ENDPOINT');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const options = {
    hostname: 'hhxr-tb-engine.vercel.app',
    path: '/api/patients?page=1&pageSize=100',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('📊 API Response:');
          console.log('─'.repeat(60));
          console.log(`Status: ${res.statusCode}`);
          console.log(`Total Count: ${parsed.totalCount?.toLocaleString() || 'N/A'}`);
          console.log(`Records Returned: ${parsed.count || parsed.data?.length || 0}`);
          console.log(`Page: ${parsed.page || 1}`);
          console.log(`Total Pages: ${parsed.totalPages || 'N/A'}`);
          console.log(`Has More: ${parsed.hasMore || false}`);
          
          if (parsed._meta) {
            console.log(`\n🔐 RBAC Info:`);
            console.log(`  Role: ${parsed._meta.role || 'N/A'}`);
            console.log(`  State: ${parsed._meta.state || 'N/A'}`);
            console.log(`  Tier: ${parsed._meta.tier || 'N/A'}`);
          }
          
          if (parsed.data && parsed.data.length > 0) {
            console.log(`\n📅 Date Distribution in Response:`);
            console.log('─'.repeat(60));
            const dateMap = new Map();
            parsed.data.forEach(record => {
              const date = record.screening_date;
              if (date) {
                dateMap.set(date, (dateMap.get(date) || 0) + 1);
              }
            });
            
            const sortedDates = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
            sortedDates.forEach(([date, count]) => {
              console.log(`  ${date}: ${count} records`);
            });
            
            console.log(`\n📋 Sample Record:`);
            console.log('─'.repeat(60));
            const sample = parsed.data[0];
            console.log(`  ID: ${sample.id}`);
            console.log(`  Name: ${sample.inmate_name || 'N/A'}`);
            console.log(`  Screening Date: ${sample.screening_date || 'NULL'}`);
            console.log(`  State: ${sample.screening_state || 'N/A'}`);
            console.log(`  District: ${sample.screening_district || 'N/A'}`);
          }
          
          console.log('\n═══════════════════════════════════════════════════════════');
          console.log('📊 DIAGNOSIS');
          console.log('═══════════════════════════════════════════════════════════\n');
          
          if (res.statusCode === 401) {
            console.log('🚨 ISSUE: Unauthorized - API requires authentication');
            console.log('   The endpoint needs a valid session token.');
          } else if (parsed.totalCount === 0) {
            console.log('🚨 ISSUE: API returns 0 records');
            console.log('   Check RBAC filters - user might not have access to any data.');
          } else if (parsed.count < 100 && parsed.totalCount > 100) {
            console.log('⚠️  WARNING: API returned fewer records than requested');
            console.log(`   Requested: 100, Got: ${parsed.count}`);
            console.log('   This might indicate filtering or query issues.');
          } else {
            console.log('✅ API is working correctly');
            console.log(`   Returning ${parsed.count} of ${parsed.totalCount} total records`);
          }
          
          console.log('\n═══════════════════════════════════════════════════════════\n');
          resolve(parsed);
        } catch (e) {
          console.error('❌ Failed to parse response:', e.message);
          console.log('Raw response:', data.substring(0, 500));
          reject(e);
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('❌ Request failed:', e.message);
      reject(e);
    });
    
    req.end();
  });
}

testPatientsAPI().catch(console.error);
