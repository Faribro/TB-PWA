import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', url);
console.log('Key exists:', !!key);

if (!url || !key) {
  console.error('Missing credentials!');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' },
});

async function run() {
  console.log('🔍 Fetching first patient from DB to get a valid ID...');
  const { data: firstPatient, error: firstError } = await supabase
    .from('patients')
    .select('id, kobo_uuid, inmate_name')
    .limit(1)
    .single();

  if (firstError) {
    console.error('❌ Failed to fetch first patient:', firstError);
    return;
  }

  console.log('✅ Found patient:', firstPatient);

  console.log('\n🔍 Testing resolvePatientIdentifier logic with patient ID:', firstPatient.id);
  const columns = 'id, kobo_uuid, unique_id, inmate_name, screening_state';

  const byKobo = await supabase
    .from('patients')
    .select(columns)
    .eq('kobo_uuid', firstPatient.id)
    .maybeSingle();

  console.log('byKobo result:', { data: byKobo.data, error: byKobo.error });

  const byId = await supabase
    .from('patients')
    .select(columns)
    .eq('id', firstPatient.id)
    .maybeSingle();

  console.log('byId result:', { data: byId.data, error: byId.error });

  if (byId.error) {
    console.error('❌ byId query threw error:', byId.error);
  }
}

run().catch(console.error);
