import { prisma } from '@/lib/prisma';

async function queryMonthMetrics(year: number, month: number) {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  const queryStr = `
    SELECT 
      registration_date::text AS date,
      SUM(screened_count)::integer AS count,
      SUM(suspected_count)::integer AS suspected,
      SUM(diagnosed_count)::integer AS "tbPositive",
      SUM(att_started_count)::integer AS "attStarted",
      SUM(referred_count)::integer AS referred
    FROM public.mv_daily_vertex_metrics
    WHERE registration_date >= $1::date AND registration_date <= $2::date
    GROUP BY registration_date
    ORDER BY registration_date ASC
  `;

  const params = [monthStart, monthEnd];
  const dbRows = await prisma.$queryRawUnsafe<any[]>(queryStr, ...params);
  
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

  return {
    month,
    startDate: monthStart,
    endDate: monthEnd,
    screened: totalScreened,
    suspected: totalSuspected,
    diagnosed: totalDiagnosed,
    attStarted: totalAttStarted,
    referred: totalReferred,
    rowsCount: dbRows.length
  };
}

async function main() {
  try {
    for (let m = 1; m <= 6; m++) {
      const res = await queryMonthMetrics(2026, m);
      console.log(`Month ${m}:`, res);
    }
  } catch (err) {
    console.error('Error querying month metrics:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
