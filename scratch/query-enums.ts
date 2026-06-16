import { prisma } from '../lib/prisma';

async function fetchEnums() {
  try {
    const sex = await prisma.patients.groupBy({ by: ['sex'] });
    const tb_diagnosed = await prisma.patients.groupBy({ by: ['tb_diagnosed'] });
    const tb_type = await prisma.patients.groupBy({ by: ['tb_type'] });
    const hiv_status = await prisma.patients.groupBy({ by: ['hiv_status'] });
    const art_status = await prisma.patients.groupBy({ by: ['art_status'] });

    console.log('--- ENUM VALUES ---');
    console.log('sex:', sex.map(x => x.sex));
    console.log('tb_diagnosed:', tb_diagnosed.map(x => x.tb_diagnosed));
    console.log('tb_type:', tb_type.map(x => x.tb_type));
    console.log('hiv_status:', hiv_status.map(x => x.hiv_status));
    console.log('art_status:', art_status.map(x => x.art_status));
  } catch (err) {
    console.error(err);
  }
}

fetchEnums();
