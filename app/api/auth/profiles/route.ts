import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-server';
import { verifyOverrideKey } from '@/app/actions/verify-override-key';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;

    const isKeyValid = await verifyOverrideKey(key);
    if (!isKeyValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = getSupabaseClient();

    let allUsers: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('profiles')
        .select('email, staff_name, role, state, district')
        .eq('is_active', true)
        .order('staff_name')
        .range(from, from + pageSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allUsers = [...allUsers, ...data];
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    return NextResponse.json({ success: true, profiles: allUsers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
