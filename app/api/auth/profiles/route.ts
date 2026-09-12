export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyOverrideKey } from '@/app/actions/verify-override-key';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;

    const isKeyValid = await verifyOverrideKey(key);
    if (!isKeyValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const profiles = await prisma.profiles.findMany({
      orderBy: { staff_name: 'asc' },
      select: {
        email: true,
        role: true,
        state: true,
        district: true,
        staff_name: true,
      },
    });

    const formatted = profiles.map(p => ({
      email: p.email,
      name: p.staff_name || p.email,
      staff_name: p.staff_name,
      role: p.role || 'Facility',
      state: p.state,
      district: p.district,
    }));

    return NextResponse.json({ success: true, profiles: formatted });
  } catch (error: any) {
    console.error('[PROFILES_API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
