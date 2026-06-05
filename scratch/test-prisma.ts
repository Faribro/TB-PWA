import { prisma } from '../lib/prisma';

async function testPrisma() {
  console.log('🧪 Testing Prisma Query with cursor...');
  try {
    const firstPage = await prisma.patients.findMany({
      take: 5,
      select: {
        id: true,
        inmate_name: true,
        created_at: true
      },
      orderBy: [
        { created_at: 'desc' },
        { id: 'desc' }
      ]
    });
    
    console.log('First page results:', firstPage.map(p => ({ id: p.id, name: p.inmate_name, created_at: p.created_at })));
    
    if (firstPage.length > 2) {
      const cursorId = firstPage[2].id;
      console.log(`Using cursor: ${cursorId}`);
      
      const secondPage = await prisma.patients.findMany({
        take: 3,
        cursor: { id: cursorId },
        skip: 1,
        select: {
          id: true,
          inmate_name: true,
          created_at: true
        },
        orderBy: [
          { created_at: 'desc' },
          { id: 'desc' }
        ]
      });
      
      console.log('Second page results:', secondPage.map(p => ({ id: p.id, name: p.inmate_name, created_at: p.created_at })));
    }
  } catch (err) {
    console.error('❌ Error during Prisma query:', err);
  }
}

testPrisma();
