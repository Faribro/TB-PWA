// ═══════════════════════════════════════════════════════════════════════════
// MANUAL SYNC MAY 2026 RECORDS TO GOOGLE SHEETS
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fgtrkxadiszoyhslwesu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndHJreGFkaXN6b3loc2x3ZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMyNDc1NiwiZXhwIjoyMDkxOTAwNzU2fQ.IwKVDUZIhyiV6dew6CepShYo5ZCTBlbC-WHS0xn3mKU';
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyBwLUKiFDY-eLdNOIzNZRsyem0rWiTA6IvelapBjHg8sGdtkTuhQs2hGbXrydeUZSu/exec';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function syncMayRecords() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔄 MANUAL SYNC: MAY 2026 RECORDS → GOOGLE SHEETS');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    // Fetch all May 2026 records
    const { data: mayRecords, error } = await supabase
      .from('patients')
      .select('*')
      .gte('screening_date', '2026-05-01')
      .lte('screening_date', '2026-05-31')
      .order('screening_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching data:', error.message);
      return;
    }

    console.log(`📊 Found ${mayRecords?.length || 0} records to sync\n`);

    if (!mayRecords || mayRecords.length === 0) {
      console.log('⚠️  No records to sync');
      return;
    }

    // Send in batches of 50
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < mayRecords.length; i += BATCH_SIZE) {
      batches.push(mayRecords.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 Sending ${batches.length} batches (${BATCH_SIZE} records each)\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📤 Batch ${i + 1}/${batches.length} (${batch.length} records)...`);

      try {
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            batch: batch.map(record => ({
              id: record.id,
              kobo_uuid: record.kobo_uuid,
              unique_id: record.unique_id,
              inmate_name: record.inmate_name,
              age: record.age,
              sex: record.sex,
              contact_number: record.contact_number,
              address: record.address,
              screening_date: record.screening_date,
              screening_state: record.screening_state,
              screening_district: record.screening_district,
              facility_name: record.facility_name,
              facility_type: record.facility_type,
              staff_name: record.staff_name,
              inmate_type: record.inmate_type,
              father_husband_name: record.father_husband_name,
              referral_date: record.referral_date,
              tb_diagnosed: record.tb_diagnosed,
              tb_diagnosis_date: record.tb_diagnosis_date,
              tb_type: record.tb_type,
              att_start_date: record.att_start_date,
              hiv_status: record.hiv_status,
              nikshay_abha_id: record.nikshay_abha_id,
            })),
            batch_id: `manual-sync-may-${i + 1}`,
            count: batch.length,
          }),
        });

        if (response.ok) {
          successCount += batch.length;
          console.log(`   ✅ Success (${response.status})`);
        } else {
          failCount += batch.length;
          console.log(`   ❌ Failed (${response.status})`);
        }

        // Wait 1 second between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        failCount += batch.length;
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 SYNC SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`Total Records:  ${mayRecords.length}`);
    console.log(`✅ Synced:      ${successCount}`);
    console.log(`❌ Failed:      ${failCount}`);
    console.log(`Success Rate:   ${((successCount / mayRecords.length) * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    if (successCount === mayRecords.length) {
      console.log('🎉 ALL RECORDS SYNCED SUCCESSFULLY!');
      console.log('📝 Check your Google Sheet for the updated data\n');
    } else {
      console.log('⚠️  Some records failed to sync');
      console.log('💡 You can run this script again to retry failed records\n');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

syncMayRecords();
