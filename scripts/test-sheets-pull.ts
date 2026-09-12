import { prisma } from '../lib/prisma';
import { pollSheetsForChanges } from '../lib/sheetsPullSync';

async function testPull() {
  console.log('🧪 Testing Sheets Pull Sync (Google Sheets -> PostgreSQL)...');
  const result = await pollSheetsForChanges('Maharashtra');
  console.log('📊 Pull Sync Result:', result);

  const hashCount = await prisma.sheet_row_hashes.count();
  console.log(`📋 Total tracked row hashes: ${hashCount}`);

  const patientCount = await prisma.patients.count();
  console.log(`👥 Total patients in PostgreSQL: ${patientCount}`);
}

testPull()
  .catch((err) => {
    console.error('❌ Pull test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
