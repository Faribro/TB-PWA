import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    return NextResponse.json({
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      state: session.user.state,
      district: (session.user as any).district,
      staffName: (session.user as any).staffName,
      rawSession: session.user,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
