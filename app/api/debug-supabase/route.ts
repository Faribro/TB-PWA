export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server-admin';

export async function GET() {
  try {
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('[/api/debug-supabase] ENV CHECK:', { hasUrl, hasKey });
    
    if (!hasUrl || !hasKey) {
      return NextResponse.json({
        error: 'Missing environment variables',
        hasUrl,
        hasKey
      }, { status: 500 });
    }

    const supabase = createServerClient();
    
    const { count, error } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('[/api/debug-supabase] Query error:', error);
      return NextResponse.json({
        error: 'Database query failed',
        details: error
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      totalPatients: count,
      hasUrl,
      hasKey,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL
    });
  } catch (error) {
    console.error('[/api/debug-supabase] Exception:', error);
    return NextResponse.json({
      error: 'Exception occurred',
      details: String(error)
    }, { status: 500 });
  }
}
