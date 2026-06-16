import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  try {
    console.log('[/api/me] Starting session fetch...');
    
    // Check environment variables
    console.log('[/api/me] Environment check:', {
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      AUTH_SECRET: !!process.env.AUTH_SECRET,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
    
    const session = await auth();
    
    console.log('[/api/me] Session result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      userRole: session?.user?.role,
    });
    
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
    console.error('[/api/me] Detailed error analysis:');
    console.error('Error type:', typeof error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('NEXT_PUBLIC_SUPABASE_URL') || error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        console.error('[/api/me] Supabase configuration error - missing environment variables');
        return NextResponse.json(
          { error: 'Configuration Error', message: 'Database configuration missing' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('auth') || error.message.includes('session')) {
        console.error('[/api/me] Authentication system error');
        return NextResponse.json(
          { error: 'Authentication Error', message: 'Authentication system unavailable' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : String(error),
        type: typeof error,
        name: error instanceof Error ? error.name : 'Unknown'
      },
      { status: 500 }
    );
  }
}
