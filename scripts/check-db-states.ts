import { prisma } from '@/lib/prisma';

async function main() {
  try {
    console.log('Querying mv_daily_vertex_metrics grouped by month and state...');
    
    const queryStr = `
      SELECT 
        DATE_TRUNC('month', registration_date)::date AS month_date,
        screening_state,
        SUM(screened_count)::integer AS screened,
        SUM(suspected_count)::integer AS suspected
      FROM public.mv_daily_vertex_metrics
      GROUP BY DATE_TRUNC('month', registration_date), screening_state
      ORDER BY month_date ASC, screened DESC
    `;

    const dbRows = await prisma.$queryRawUnsafe<any[]>(queryStr);
    console.log('Results:');
    dbRows.forEach(row => {
      console.log(`Month: ${row.month_date.toISOString().slice(0, 7)} | State: ${row.screening_state || '(empty)'} | Screened: ${row.screened} | Suspected: ${row.suspected}`);
    });
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
