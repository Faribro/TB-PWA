// ═══════════════════════════════════════════════════════════════════════════
// CHECK RECENT SUPABASE SUBMISSIONS
// ═══════════════════════════════════════════════════════════════════════════
// Verifies recent data in Supabase that should be synced to Google Sheets
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fgtrkxadiszoyhslwesu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndHJreGFkaXN6b3loc2x3ZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMyNDc1NiwiZXhwIjoyMDkxOTAwNzU2fQ.IwKVDUZIhyiV6dew6CepShYo5ZCTBlbC-WHS0xn3mKU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkRecentSubmissions() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔍 CHECKING RECENT SUPABASE SUBMISSIONS');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    // Get records from May 2026 (dates 1, 2, 3, 10, 24)
    const { data: mayRecords, error } = await supabase
      .from('patients')
      .select('id, kobo_uuid, unique_id, inmate_name, screening_date, screening_state, screening_district, facility_name, facility_type, referral_date, staff_name, inmate_type, created_at, updated_at')
      .gte('screening_date', '2026-05-01')
      .lte('screening_date', '2026-05-31')
      .order('screening_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching data:', error.message);
      return;
    }

    console.log(`📊 Found ${mayRecords?.length || 0} records from May 2026\n`);

    if (mayRecords && mayRecords.length > 0) {
      console.log('═══════════════════════════════════════════════════════════════════════════');
      console.log('📋 RECENT SUBMISSIONS (May 2026)');
      console.log('═══════════════════════════════════════════════════════════════════════════\n');

      mayRecords.forEach((record, index) => {
        const screeningDate = new Date(record.screening_date);
        const createdAt = new Date(record.created_at);
        const updatedAt = new Date(record.updated_at);
        
        console.log(`${index + 1}. ${record.inmate_name || 'N/A'}`);
        console.log(`   Screening Date: ${screeningDate.toLocaleDateString('en-GB')}`);
        console.log(`   State/District: ${record.screening_state || 'N/A'} / ${record.screening_district || 'N/A'}`);
        console.log(`   Facility: ${record.facility_name || 'N/A'} (${record.facility_type || 'N/A'})`);
        console.log(`   Staff Name: ${record.staff_name || 'N/A'}`);
        console.log(`   Inmate Type: ${record.inmate_type || 'N/A'}`);
        console.log(`   KoboUUID: ${record.kobo_uuid || 'N/A'}`);
        console.log(`   Unique ID: ${record.unique_id || 'N/A'}`);
        console.log(`   Created: ${createdAt.toLocaleString('en-GB')}`);
        console.log(`   Updated: ${updatedAt.toLocaleString('en-GB')}`);
        console.log('');
      });

      console.log('═══════════════════════════════════════════════════════════════════════════');
      console.log('📊 SUMMARY');
      console.log('═══════════════════════════════════════════════════════════════════════════');
      console.log(`Total Records: ${mayRecords.length}`);
      console.log(`Date Range: ${new Date(mayRecords[0].screening_date).toLocaleDateString('en-GB')} to ${new Date(mayRecords[mayRecords.length - 1].screening_date).toLocaleDateString('en-GB')}`);
      console.log('');
      console.log('✅ These records should be in Google Sheets');
      console.log('⚠️  If missing, the sync may have failed during submission');
      console.log('');
      console.log('📝 Next Steps:');
      console.log('   1. Check Google Sheet for these KoboUUIDs');
      console.log('   2. If missing, we can manually trigger a sync');
      console.log('   3. Or check if they were created before webhook was set up');
      console.log('');
    } else {
      console.log('⚠️  No records found for May 2026');
      console.log('   This might mean:');
      console.log('   - Dates are in different format');
      console.log('   - Records are in different month/year');
      console.log('   - No data has been submitted yet');
      console.log('');
    }

    // Also check most recent records regardless of date
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🕐 LAST 10 RECORDS (by creation time)');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    const { data: recentRecords, error: recentError } = await supabase
      .from('patients')
      .select('id, inmate_name, screening_date, screening_state, screening_district, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('❌ Error fetching recent records:', recentError.message);
      return;
    }

    if (recentRecords && recentRecords.length > 0) {
      recentRecords.forEach((record, index) => {
        const createdAt = new Date(record.created_at);
        console.log(`${index + 1}. ${record.inmate_name || 'N/A'} - ${record.screening_state || 'N/A'}/${record.screening_district || 'N/A'}`);
        console.log(`   Screening: ${record.screening_date || 'N/A'}`);
        console.log(`   Created: ${createdAt.toLocaleString('en-GB')}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkRecentSubmissions();
