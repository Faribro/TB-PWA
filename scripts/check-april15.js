/**
 * Check for entries with screening_date = 2026-04-15
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wwcgybgvfulotflitogu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

async function checkApril15() {
  console.log('🔍 Checking for entries with screening_date = 2026-04-15...\n');
  
  // Check for April 15 entries
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patients?select=kobo_uuid,inmate_name,facility_name,screening_date,webhook_received_at,created_at&screening_date=eq.2026-04-15&order=created_at.desc`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (res.ok) {
    const data = await res.json();
    if (data.length > 0) {
      console.log(`✅ Found ${data.length} entries with screening_date = 2026-04-15:\n`);
      data.forEach((record, idx) => {
        console.log(`  ${idx + 1}. UUID: ${record.kobo_uuid || 'N/A'}`);
        console.log(`     Name: ${record.inmate_name || 'N/A'}`);
        console.log(`     Facility: ${record.facility_name || 'N/A'}`);
        console.log(`     Screening Date: ${record.screening_date || 'N/A'}`);
        console.log(`     Webhook Time: ${record.webhook_received_at || 'NOT via webhook'}`);
        console.log(`     Created: ${record.created_at || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ No entries found with screening_date = 2026-04-15\n');
      console.log('Checking last 10 entries regardless of date...\n');
      
      const allRes = await fetch(
        `${SUPABASE_URL}/rest/v1/patients?select=kobo_uuid,inmate_name,screening_date,webhook_received_at,created_at&order=created_at.desc&limit=10`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      
      if (allRes.ok) {
        const allData = await allRes.json();
        console.log(`Last 10 entries:\n`);
        allData.forEach((record, idx) => {
          console.log(`  ${idx + 1}. ${record.inmate_name || 'N/A'} - Screening: ${record.screening_date || 'N/A'} - Created: ${record.created_at || 'N/A'}`);
        });
      }
    }
  } else {
    console.error('❌ Failed to fetch:', await res.text());
  }
}

checkApril15();
