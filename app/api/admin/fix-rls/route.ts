import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';

export const maxDuration = 15;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    if (userRole !== 'Admin' && userRole !== 'PM') {
      return NextResponse.json({ error: 'Forbidden - Admin/PM only' }, { status: 403 });
    }

    const supabase = createServerClient();

    const { error: patientsError } = await supabase.rpc('exec_sql', { 
      sql: `
        DROP POLICY IF EXISTS "service_role_all_patients" ON patients;
        CREATE POLICY "service_role_all_patients" ON patients
        FOR ALL TO service_role USING (true) WITH CHECK (true);
      `
    });

    const { error: profilesError } = await supabase.rpc('exec_sql', { 
      sql: `
        DROP POLICY IF EXISTS "service_role_all_profiles" ON profiles;
        CREATE POLICY "service_role_all_profiles" ON profiles
        FOR ALL TO service_role USING (true) WITH CHECK (true);
      `
    });

    if (patientsError || profilesError) {
      console.error('[fix-rls] Policy creation failed:', { patientsError, profilesError });
      return NextResponse.json({ 
        error: 'Policy creation failed',
        details: { patientsError, profilesError }
      }, { status: 500 });
    }

    console.log('[fix-rls] ✅ Service role policies created');

    return NextResponse.json({ 
      success: true,
      message: 'Service role policies created'
    });
  } catch (error) {
    console.error('[fix-rls] Exception:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
