import { NextRequest, NextResponse } from 'next/server';
import { clearProfileCache } from '@/lib/auth-cache';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email, clearAll } = await req.json();
    
    if (clearAll) {
      clearProfileCache();
      return NextResponse.json({ success: true, message: 'All cache cleared' });
    }
    
    if (email) {
      clearProfileCache(email);
      return NextResponse.json({ success: true, message: `Cache cleared for ${email}` });
    }
    
    return NextResponse.json({ error: 'Missing email or clearAll parameter' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
  }
}
