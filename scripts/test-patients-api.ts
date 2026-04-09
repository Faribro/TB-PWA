/**
 * Test the /api/patients endpoint directly
 */

async function testPatientsAPI() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 TESTING /api/patients ENDPOINT');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    console.log('Calling http://localhost:3000/api/patients...\n');
    
    const response = await fetch('http://localhost:3000/api/patients', {
      headers: {
        'Cookie': process.env.TEST_COOKIE || '' // You'll need to add your session cookie
      }
    });

    if (!response.ok) {
      console.error(`❌ API returned ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const result = await response.json();
    
    console.log('✅ API Response:');
    console.log(`  Records returned: ${result.data?.length || 0}`);
    console.log(`  Count field: ${result.count}`);
    
    if (result.data && result.data.length > 0) {
      // Check state distribution
      const states = new Map<string, number>();
      result.data.forEach((p: any) => {
        const state = p.screening_state || 'NULL';
        states.set(state, (states.get(state) || 0) + 1);
      });
      
      console.log('\n  State breakdown:');
      Array.from(states.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([state, count]) => {
          console.log(`    ${state}: ${count}`);
        });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════\n');
}

testPatientsAPI();
