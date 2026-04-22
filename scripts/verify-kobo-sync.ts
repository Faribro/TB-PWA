// Quick verification: Check if Kobo webhook data reached Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function verify() {
  console.log('🔍 Checking recent Kobo webhook submissions...\n');

  // Get last 5 records
  const { data, error } = await supabase
    .from('patients')
    .select('kobo_uuid, inmate_name, screening_date, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`✅ Found ${data?.length || 0} recent records:\n`);
  data?.forEach((p, i) => {
    console.log(`${i + 1}. ${p.inmate_name || 'Unknown'}`);
    console.log(`   UUID: ${p.kobo_uuid}`);
    console.log(`   Screening: ${p.screening_date || 'N/A'}`);
    console.log(`   Created: ${new Date(p.created_at).toLocaleString()}\n`);
  });
}

verify();
