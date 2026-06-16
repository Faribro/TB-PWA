import { prisma } from '../lib/prisma';

async function main() {
  try {
    const columns = await prisma.$queryRawUnsafe<any[]>(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'patients'
      ORDER BY column_name
    `);
    
    console.log('PostgreSQL patients columns:');
    columns.forEach(c => {
      console.log(`  - ${c.column_name} (${c.data_type})`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
