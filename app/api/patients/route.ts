import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';
import { normalizeRole, Role } from '@/lib/constants/roles';

export const maxDuration = 60; // Extend timeout to 60s for Pro plan

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    
    const rawRole = session.user.role ?? 'ME';
    const role = normalizeRole(rawRole) ?? Role.ME_OFFICER;
    const state = session.user.state;
    const staffName = (session.user as any).staffName;

    console.log('[/api/patients] User:', session.user.email, 'Role:', rawRole, '→', role, 'State:', state);

    // Build query with filters
    let query = supabase.from('patients').select('*').limit(20000); // Override default 1000 limit
    
    if (role === Role.ADMIN || role === Role.PROGRAM_MANAGER) {
      // National - no filter
    } else if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
      if (state && state !== 'All') {
        query = query.eq('screening_state', state);
      }
    } else if (role === Role.PRISON_COORDINATOR) {
      if (staffName) {
        query = query.ilike('staff_name', staffName.trim());
      }
    }

    // Fetch ALL data in single query (no batching)
    const { data, error } = await query;

    if (error) {
      console.error('[/api/patients] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    console.log(`[/api/patients] ✅ Fetched ${data?.length || 0} records in ${duration}ms`);

    return NextResponse.json({ data: data || [], count: data?.length || 0 });
  } catch (error) {
    console.error('[/api/patients] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
