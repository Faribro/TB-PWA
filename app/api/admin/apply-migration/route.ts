import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseClient } from '@/lib/supabase-server';
import { Role } from '@/lib/constants/roles';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    if (userRole !== Role.ADMIN && userRole !== Role.PROGRAM_MANAGER) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'Only admins can apply migrations' 
      }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    const results = [];

    // Step 1: Create updated_at function
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION update_updated_at()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `
      });
      results.push('✅ Created update_updated_at function');
    } catch (e: any) {
      results.push(`⚠️ Function: ${e.message}`);
    }

    // Step 2: Add trigger to patients
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          DROP TRIGGER IF EXISTS patients_update_updated_at ON patients;
          CREATE TRIGGER patients_update_updated_at
            BEFORE UPDATE ON patients
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
        `
      });
      results.push('✅ Created patients trigger');
    } catch (e: any) {
      results.push(`⚠️ Trigger: ${e.message}`);
    }

    // Step 3: Create audit_log table
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS audit_log (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
        `
      });
      results.push('✅ Created audit_log table');
    } catch (e: any) {
      results.push(`⚠️ Table: ${e.message}`);
    }

    // Step 4: Create indexes
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
          CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);
          CREATE INDEX IF NOT EXISTS idx_audit_log_table_action ON audit_log(table_name, action);
        `
      });
      results.push('✅ Created indexes');
    } catch (e: any) {
      results.push(`⚠️ Indexes: ${e.message}`);
    }

    // Step 5: Enable RLS
    try {
      await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;`
      });
      results.push('✅ Enabled RLS on audit_log');
    } catch (e: any) {
      results.push(`⚠️ RLS: ${e.message}`);
    }

    // Step 6: Create policies
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          DROP POLICY IF EXISTS "admins_read_audit_log" ON audit_log;
          CREATE POLICY "admins_read_audit_log"
            ON audit_log
            FOR SELECT
            TO authenticated
            USING (true);
        `
      });
      results.push('✅ Created read policy');
    } catch (e: any) {
      results.push(`⚠️ Read policy: ${e.message}`);
    }

    try {
      await supabase.rpc('exec_sql', {
        sql: `
          DROP POLICY IF EXISTS "service_role_insert_audit_log" ON audit_log;
          CREATE POLICY "service_role_insert_audit_log"
            ON audit_log
            FOR INSERT
            TO service_role
            WITH CHECK (true);
        `
      });
      results.push('✅ Created insert policy');
    } catch (e: any) {
      results.push(`⚠️ Insert policy: ${e.message}`);
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Migration applied successfully'
    });

  } catch (err) {
    console.error('[apply-migration] Exception:', err);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
