/**
 * Check patients table schema - column types
 */

const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

async function checkSchema() {
  console.log('🔍 Checking patients table column types...\n');
  
  const query = `
    SELECT 
      column_name, 
      data_type, 
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_name = 'patients' 
    AND column_name IN ('id', 'kobo_uuid', 'kobo_id', 'screening_date', 'created_at')
    ORDER BY ordinal_position;
  `;
  
  try {
    // Use PostgREST to query information_schema
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!res.ok) {
      console.log('⚠️  RPC not available, using direct table query...\n');
      
      // Alternative: Get a sample record to infer types
      const sampleRes = await fetch(
        `${SUPABASE_URL}/rest/v1/patients?select=id,kobo_uuid,kobo_id,screening_date,created_at&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      
      if (sampleRes.ok) {
        const sample = await sampleRes.json();
        if (sample.length > 0) {
          console.log('Sample record:');
          console.log(JSON.stringify(sample[0], null, 2));
          console.log('\nColumn types (inferred):');
          Object.entries(sample[0]).forEach(([key, value]) => {
            console.log(`  ${key}: ${typeof value} (value: ${value})`);
          });
        }
      }
    } else {
      const data = await res.json();
      console.log('Column types:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkSchema();
