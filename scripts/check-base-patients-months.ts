import { prisma } from '../lib/prisma';

async function main() {
  try {
    console.log('Querying public.patients from database directly...');
    
    // Query counts by month of screening_date
    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        DATE_TRUNC('month', screening_date)::text AS month_date,
        COUNT(*)::integer AS count,
        COUNT(*) FILTER (WHERE screening_state IS NULL OR screening_state = '')::integer AS empty_state_count
      FROM public.patients
      WHERE screening_date >= '2026-01-01' AND screening_date <= '2026-12-31'
      GROUP BY DATE_TRUNC('month', screening_date)
      ORDER BY month_date ASC
    `);
    
    console.log('Direct patients table monthly breakdown for 2026:');
    result.forEach(row => {
      console.log(`Month: ${row.month_date?.slice(0, 7) || 'NULL'} | Count: ${row.count} | Empty State Count: ${row.empty_state_count}`);
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
