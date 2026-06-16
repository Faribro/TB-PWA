import { prisma } from '../lib/prisma';
import 'dotenv/config';

async function main() {
  console.log('Querying patient count by state...');
  try {
    const counts = await prisma.patients.groupBy({
      by: ['screening_state'],
      _count: {
        _all: true
      }
    });
    console.log('Counts by state:');
    for (const c of counts) {
      console.log(`- State: "${c.screening_state}", Count: ${c._count._all}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
