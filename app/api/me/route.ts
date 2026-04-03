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

    return NextResponse.json(scope);
  } catch (error) {
    console.error('[/api/me] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: String(error) },
      { status: 500 }
    );
  }
}
