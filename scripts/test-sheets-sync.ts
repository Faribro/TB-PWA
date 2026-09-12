import { prisma } from '../lib/prisma';
import { appendPatientToSheets, flushSheetsQueue } from '../lib/sheetsSync';

async function testSync() {
  console.log('🧪 Testing Google Sheets Push Sync...');

  // 1. Create a test patient record in DB
  const testPatient = await prisma.patients.create({
    data: {
      unique_id: `MH-TEST-${Date.now()}`,
      inmate_name: 'Aarav Sharma (Test Sync)',
      screening_state: 'Maharashtra',
      screening_district: 'Pune',
      facility_name: 'Yerwada Central Prison',
      facility_type: 'Prison',
      screening_date: new Date(),
      age: 34,
      sex: 'Male',
      contact_number: '9876543210',
      address: 'Yerwada, Pune, Maharashtra',
      xray_result: 'Normal',
      symptoms_present: 'No Symptoms',
      hiv_status: 'Negative',
      staff_name: 'Alliance Test Staff',
    },
  });

  console.log(`✅ Created patient in DB: ${testPatient.id} (${testPatient.unique_id})`);

  // 2. Queue for sheets sync
  console.log('📤 Queueing patient for sheets sync...');
  await appendPatientToSheets(testPatient);

  // 3. Flush queue immediately
  console.log('🚀 Flushing queue...');
  await flushSheetsQueue();

  // 4. Verify DB was updated with sync confirmation
  const updated = await prisma.patients.findUnique({
    where: { id: testPatient.id },
  });

  console.log('📊 Verification from PostgreSQL:');
  console.log(`   synced_to_sheets: ${updated?.synced_to_sheets}`);
  console.log(`   sheets_synced_at: ${updated?.sheets_synced_at}`);
  console.log(`   sheet_row_number: ${updated?.sheet_row_number}`);
  console.log(`   sheet_tab_name: ${updated?.sheet_tab_name}`);
  console.log(`   spreadsheet_id: ${updated?.spreadsheet_id}`);

  if (updated?.synced_to_sheets) {
    console.log('\n🎉 Push Sync Test PASSED! Record written to Google Sheets & PostgreSQL.');
  } else {
    throw new Error('Sync failed to record in DB');
  }
}

testSync()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
