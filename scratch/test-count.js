const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying patient count via Prisma...');
  const count = await prisma.patients.count();
  console.log('Total patient count:', count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
