import { prisma } from '../lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  console.log('🚀 Applying Supabase SQL migration via Prisma...');
  try {
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260612154832_add_trigram_indexes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split statements by semicolon, but clean up comments and empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
      let stmt = statements[i];
      // Strip comments
      stmt = stmt.replace(/--.*$/gm, '').trim();
      if (!stmt) continue;
      
      console.log(`Executing [${i + 1}]:\n${stmt}\n`);
      await prisma.$executeRawUnsafe(stmt);
      console.log(`✅ Success`);
    }
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
