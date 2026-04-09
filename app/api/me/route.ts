import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      console.error('[/api/me] No session found');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No active session' },
        { status: 401 }
      );
    }

    const role = session.user.role ?? 'ME';
    const rawState = (session.user.state ?? 'All').trim();
    const rawDist = ((session.user as any).district ?? 'All').trim();
    const staffName = (session.user as any).staffName ?? session.user.name;

    const SUPERUSER_ROLES = ['PM', 'admin', 'Program Manager'];
    const isSuperuser = SUPERUSER_ROLES.includes(role);
    const isStateLevel = ['SPM', 'ME', 'M&E Officer', 'State Program Manager'].includes(role);

    const scope = {
      role,
      state: (isSuperuser || rawState === 'All') ? null : rawState,
      district: (isSuperuser || isStateLevel || rawDist === 'All') ? null : rawDist,
      staffName: (role === 'PC' || role === 'Prison Coordinator') ? staffName : null,
    };

    // DIAGNOSTIC LOGGING FOR RLS DEBUGGING
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 [/api/me] SESSION SCOPE DIAGNOSTIC');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Raw session.user.role:', session.user.role);
    console.log('Raw session.user.state:', session.user.state);
    console.log('Raw session.user.district:', (session.user as any).district);
    console.log('Raw session.user.staffName:', (session.user as any).staffName);
    console.log('-----------------------------------------------------------');
    console.log('Computed scope.role:', scope.role);
    console.log('Computed scope.state:', scope.state);
    console.log('Computed scope.district:', scope.district);
    console.log('Computed scope.staffName:', scope.staffName);
    console.log('-----------------------------------------------------------');
    console.log('RLS Policy Match Analysis:');
    if (['admin', 'Program Manager'].includes(scope.role)) {
      console.log('✅ Should match: patients_select_national');
    } else if (['State Program Manager', 'M&E Officer'].includes(scope.role)) {
      console.log('✅ Should match: patients_select_state (if state matches)');
    } else if (scope.role === 'Prison Coordinator') {
      console.log('✅ Should match: patients_select_facility (if staff_name matches)');
    } else {
      console.log('❌ NO POLICY MATCH - Role not recognized by RLS!');
      console.log('   Expected one of: admin, Program Manager, State Program Manager, M&E Officer, Prison Coordinator');
      console.log('   Got:', scope.role);
    }
    console.log('═══════════════════════════════════════════════════════');

    return NextResponse.json(scope);
  } catch (error) {
    console.error('[/api/me] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: String(error) },
      { status: 500 }
    );
  }
}
