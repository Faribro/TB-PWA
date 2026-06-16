const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFuzzyLookup() {
  console.log('🧪 Testing Fuzzy Staff Lookup\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const testCases = [
    { input: 'Arun Waghmare', description: 'Exact match' },
    { input: 'arun waghmare', description: 'Case insensitive' },
    { input: 'Arun', description: 'Partial (first name only)' },
    { input: 'Waghmare', description: 'Partial (last name only)' },
    { input: 'Arun  Waghmare', description: 'Double space' },
    { input: 'Dheerendra Kumar Verma', description: 'Full name' },
    { input: 'Dheerendra', description: 'First name only' },
  ];

  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.description}`);
    console.log(`   Input: "${testCase.input}"\n`);

    const { data: exact } = await supabase
      .from('patients')
      .select('staff_name')
      .ilike('staff_name', testCase.input)
      .limit(5);

    if (exact?.length) {
      console.log(`   ✅ Strategy 1 (Exact): Found ${exact.length} records`);
      exact.forEach(r => console.log(`      - "${r.staff_name}"`));
    } else {
      console.log(`   ❌ Strategy 1 (Exact): No matches`);

      const words = testCase.input.trim().split(/\s+/);
      const firstWord = words[0];

      const { data: contains } = await supabase
        .from('patients')
        .select('staff_name')
        .ilike('staff_name', `%${firstWord}%`)
        .limit(5);

      if (contains?.length) {
        console.log(`   ✅ Strategy 2 (Contains): Found ${contains.length} records`);
        const unique = [...new Set(contains.map(r => r.staff_name))];
        unique.forEach(name => console.log(`      - "${name}"`));
      } else {
        console.log(`   ❌ Strategy 2 (Contains): No matches`);
      }
    }

    console.log('\n');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Fuzzy lookup test complete\n');
}

testFuzzyLookup();
