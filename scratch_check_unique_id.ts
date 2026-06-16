import { prisma } from './lib/prisma';

async function main() {
  const countTotal = await prisma.patients.count({
    where: {
      screening_state: 'Gujarat',
      screening_district: 'Surat',
      facility_name: 'CJ'
    }
  });
  console.log('Total patients in Gujarat, Surat, CJ:', countTotal);

  const countWithUniqueId = await prisma.patients.count({
    where: {
      screening_state: 'Gujarat',
      screening_district: 'Surat',
      facility_name: 'CJ',
      unique_id: {
        not: null
      }
    }
  });
  console.log('Patients with non-null unique_id in Gujarat, Surat, CJ:', countWithUniqueId);

  const sampleWithUniqueId = await prisma.patients.findMany({
    where: {
      screening_state: 'Gujarat',
      screening_district: 'Surat',
      facility_name: 'CJ',
      unique_id: {
        not: null
      }
    },
    take: 5,
    select: {
      id: true,
      inmate_name: true,
      unique_id: true
    }
  });
  console.log('Sample patients with unique_id in Gujarat, Surat, CJ:', JSON.stringify(sampleWithUniqueId, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
