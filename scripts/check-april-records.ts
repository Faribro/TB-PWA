// Check all records from April 21-22, 2026 in Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkAprilRecords() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 CHECKING APRIL 21-22, 2026 RECORDS IN SUPABASE');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // April 21, 2026 00:00:00 UTC
  const april21Start = '2026-04-21T00:00:00.000Z';
  // April 23, 2026 00:00:00 UTC (to include all of April 22)
  const april23Start = '2026-04-23T00:00:00.000Z';

  const { data, error, count } = await supabase
    .from('patients')
    .select('kobo_uuid, inmate_name, screening_date, screening_state, screening_district, created_at', { count: 'exact' })
    .gte('created_at', april21Start)
    .lt('created_at', april23Start)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`✅ Total records found: ${count}\n`);

  if (!data || data.length === 0) {
    console.log('⚠️  No records found for April 21-22, 2026');
    return;
  }

  // Group by date
  const byDate: Record<string, any[]> = {};
  data.forEach(record => {
    const date = new Date(record.created_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(record);
  });

  // Display grouped by date
  Object.keys(byDate).sort().forEach(date => {
    const records = byDate[date];
    console.log(`\n📅 ${date} (${records.length} records)`);
    console.log('─'.repeat(79));
    
    records.forEach((r, i) => {
      const time = new Date(r.created_at).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      console.log(`${i + 1}. [${time}] ${r.inmate_name || 'Unknown'}`);
      console.log(`   State: ${r.screening_state || 'N/A'} | District: ${r.screening_district || 'N/A'}`);
      console.log(`   UUID: ${r.kobo_uuid?.substring(0, 36) || 'N/A'}`);
    });
  });

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log(`📊 SUMMARY: ${count} total records from April 21-22, 2026`);
  console.log('═══════════════════════════════════════════════════════════════════════════');
}

checkAprilRecords();
