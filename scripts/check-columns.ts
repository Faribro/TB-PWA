import { prisma } from '@/lib/prisma';

async function main() {
  try {
    console.log('Querying patients table column names from database schema...');
    
    const columns = await prisma.$queryRawUnsafe<any[]>(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patients' AND table_schema = 'public'
    `);
    
    console.log('Columns:');
    columns.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
