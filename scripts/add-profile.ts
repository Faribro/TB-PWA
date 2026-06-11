import { prisma } from '@/lib/prisma';

async function main() {
  console.log('Adding user profile to database...');
  
  const result = await prisma.profiles.upsert({
    where: { email: 'faridsayyed1010@gmail.com' },
    update: {
      role: 'PM',
      state: 'Maharashtra',
      district: 'Mumbai',
    },
    create: {
      email: 'faridsayyed1010@gmail.com',
      role: 'PM',
      state: 'Maharashtra',
      district: 'Mumbai',
      staff_name: 'Farid Sayyed',
    },
  });

  console.log('Profile created/updated:', result);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());