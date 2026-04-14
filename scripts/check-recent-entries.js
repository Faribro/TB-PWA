/**
 * Check for most recent database entries
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wwcgybgvfulotflitogu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

async function checkRecent() {
  console.log('🔍 Checking for most recent entries (last 10 minutes)...\n');
  
  // Get all recent entries sorted by created_at
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patients?select=kobo_uuid,inmate_name,facility_name,webhook_received_at,created_at&order=created_at.desc&limit=5`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (res.ok) {
    const data = await res.json();
    console.log(`✅ Found ${data.length} most recent entries:\n`);
    data.forEach((record, idx) => {
      console.log(`  ${idx + 1}. UUID: ${record.kobo_uuid || 'N/A'}`);
      console.log(`     Name: ${record.inmate_name || 'N/A'}`);
      console.log(`     Facility: ${record.facility_name || 'N/A'}`);
      console.log(`     Webhook Time: ${record.webhook_received_at || 'NOT via webhook'}`);
      console.log(`     Created: ${record.created_at || 'N/A'}`);
      console.log('');
    });
  } else {
    console.error('❌ Failed to fetch:', await res.text());
  }
}

checkRecent();
