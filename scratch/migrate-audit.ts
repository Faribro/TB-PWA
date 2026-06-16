import { prisma } from '../lib/prisma';

async function run() {
  console.log('Running audit_log DDL migration via Prisma...');
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_name TEXT NOT NULL,
        record_id UUID NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
        old_data JSONB,
        new_data JSONB,
        changed_by TEXT,
        changed_at TIMESTAMPTZ DEFAULT NOW(),
        ip_address TEXT,
        user_agent TEXT
      );
    `);
    console.log('✅ audit_log table verified/created.');
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_log_table_action ON audit_log(table_name, action);
    `);
    console.log('✅ Indexes verified/created.');

    // Reload PostgREST schema cache so Supabase JS client knows about it
    await prisma.$executeRawUnsafe("NOTIFY pgrst, 'reload';");
    console.log('✅ PostgREST schema reload notified.');
    
    console.log('🎉 Migration successful!');
  } catch (err: any) {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  }
}

run();
