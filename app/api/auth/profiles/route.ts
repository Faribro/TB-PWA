import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-server';
import { verifyOverrideKey } from '@/app/actions/verify-override-key';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;

    console.log('[PROFILES_API] Checking key validity...');
    const isKeyValid = await verifyOverrideKey(key);
    if (!isKeyValid) {
      console.log('[PROFILES_API] Invalid key');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('[PROFILES_API] Key valid, fetching profiles...');
    const supabase = getSupabaseClient();

    let allUsers: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('profiles')
        .select('email, name, staff_name, role, state, district')
        .order('name')
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('[PROFILES_API] Error fetching profiles:', error);
        throw error;
      }

      console.log(`[PROFILES_API] Fetched ${data?.length || 0} profiles`);

      if (data && data.length > 0) {
        allUsers = [...allUsers, ...data];
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    console.log('[PROFILES_API] Total profiles:', allUsers.length);

    return NextResponse.json({ success: true, profiles: allUsers });
  } catch (error: any) {
    console.error('[PROFILES_API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
