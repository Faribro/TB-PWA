import { prisma } from '@/lib/prisma';

async function main() {
  // Check all profiles
  const profiles = await prisma.profiles.findMany({
    select: { email: true, role: true, state: true, district: true, staff_name: true }
  });
  
  console.log('All profiles:', JSON.stringify(profiles, null, 2));
  
  // Check specific email
  const profile = await prisma.profiles.findUnique({
    where: { email: 'faridsayyed1010@gmail.com' }
  });
  
  console.log('\nFarid profile:', profile);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());