const SUPABASE_URL = 'https://wwcgybgvfulotflitogu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patients?select=id,kobo_uuid,kobo_id&limit=3`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  
  const data = await res.json();
  console.log('Sample records:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data.length > 0) {
    console.log('\nColumn analysis:');
    console.log(`id type: ${typeof data[0].id} (value: ${data[0].id})`);
    console.log(`kobo_uuid type: ${typeof data[0].kobo_uuid} (value: ${data[0].kobo_uuid})`);
    console.log(`kobo_id type: ${typeof data[0].kobo_id} (value: ${data[0].kobo_id})`);
  }
}

check();
