import { prisma } from '@/lib/prisma';

async function main() {
  const year = 2026;
  const month = 3;
  const startDate = '2026-03-01';
  const endDate = '2026-03-31';

  try {
    console.log('Testing March 2026 metrics query directly via Prisma...');
    
    let queryStr = `
      SELECT 
        registration_date::text AS date,
        SUM(screened_count)::integer AS count,
        SUM(suspected_count)::integer AS suspected,
        SUM(diagnosed_count)::integer AS "tbPositive",
        SUM(att_started_count)::integer AS "attStarted",
        SUM(referred_count)::integer AS referred
      FROM public.mv_daily_vertex_metrics
      WHERE registration_date >= $1::date AND registration_date <= $2::date
    `;

    const params: any[] = [startDate, endDate];
    
    queryStr += `
      GROUP BY registration_date
      ORDER BY registration_date ASC
    `;

    const dbRows = await prisma.$queryRawUnsafe<any[]>(queryStr, ...params);
    console.log(`Fetched ${dbRows.length} rows from database.`);
    
    let totalScreened = 0;
    let totalSuspected = 0;
    let totalDiagnosed = 0;
    let totalAttStarted = 0;
    let totalReferred = 0;

    dbRows.forEach((row: any) => {
      totalScreened += Number(row.count || 0);
      totalSuspected += Number(row.suspected || 0);
      totalDiagnosed += Number(row.tbPositive || 0);
      totalAttStarted += Number(row.attStarted || 0);
      totalReferred += Number(row.referred || 0);
    });

    console.log({
      screened: totalScreened,
      suspected: totalSuspected,
      diagnosed: totalDiagnosed,
      attStarted: totalAttStarted,
      referred: totalReferred,
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
