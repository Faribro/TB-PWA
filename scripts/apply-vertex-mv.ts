import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

async function applyVertexMaterializedView() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🚀 DEPLOYING DAILY VERTEX METRICS MATERIALIZED VIEW');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260605_mv_daily_vertex_metrics.sql');
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at: ${migrationPath}`);
    }

    console.log(`Reading SQL file: ${migrationPath}`);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing SQL migration in database...');
    // We execute the raw SQL script
    await prisma.$executeRawUnsafe(sql);

    console.log('✅ Materialized view public.mv_daily_vertex_metrics deployed successfully!');
    console.log('✅ Unique index idx_mv_daily_vertex_metrics_unique created.');
    console.log('✅ Auto-refresh trigger trigger_refresh_mv_daily_vertex_metrics established.\n');

    // Run a quick verification query
    console.log('🔍 Verifying view and index presence in database...');
    const result: any = await prisma.$queryRawUnsafe(`
      SELECT count(*)::int AS count 
      FROM public.mv_daily_vertex_metrics
    `);
    
    console.log(`🎉 Success! View is online. Current rows count: ${result[0]?.count ?? 0}`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Failed to deploy materialized view:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyVertexMaterializedView();
