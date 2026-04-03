import { NextResponse } from 'next/server';
import { getSessionScope } from '@/lib/session-scope';

export async function GET() {
  try {
    const scope = await getSessionScope();
    return NextResponse.json(scope);
  } catch (error) {
    console.error('[/api/me] Error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
