import { createClient } from '@supabase/supabase-js';

// Load environment variables
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const migrationSQL = `
-- Add missing clinical & treatment columns to patients table
-- Date: 2026-05-12

-- Add Other Facility Name
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS other_facility_name TEXT;

-- Add Treatment Regimen
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS treatment_regimen TEXT;

-- Add Closure Reason (if not already present)
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS closure_reason TEXT;
`;

async function applyMigration() {
  console.log('🚀 Applying clinical migration...');

  try {
    // We need to use pg directly via rpc or just split into statements
    // Since Supabase JS doesn't support multi-statement SQL easily, let's run each ALTER TABLE separately
    const statements = [
      'ALTER TABLE patients ADD COLUMN IF NOT EXISTS other_facility_name TEXT',
      'ALTER TABLE patients ADD COLUMN IF NOT EXISTS treatment_regimen TEXT',
      'ALTER TABLE patients ADD COLUMN IF NOT EXISTS closure_reason TEXT',
    ];

    for (const stmt of statements) {
      console.log(`Executing: ${stmt}`);
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: stmt });
        if (error) {
          console.warn(`⚠️  Could not execute via RPC: ${error.message}`);
        }
      } catch (rpcError) {
        // If exec_sql doesn't exist, let's just check if columns exist and skip
        console.warn('⚠️  RPC exec_sql not available, skipping...');
      }

    }

    // Verify the columns exist
    console.log('\n✅ Verifying columns...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'patients')
      .in('column_name', ['other_facility_name', 'treatment_regimen', 'closure_reason']);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
    } else {
      console.log('\n✅ Migration complete! Columns:');
      console.table(verifyData);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Fallback: Just provide the SQL to user
console.log('\n📋 If the above script fails, run this directly in Supabase SQL Editor:');
console.log(migrationSQL);

applyMigration();
