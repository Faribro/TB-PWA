import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'PM')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const supabase = getSupabaseClient();
    
    // Get total count first
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    let allUsers: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    // Fetch all records using pagination
    while (hasMore) {
      const { data, error } = await supabase
        .from('profiles')
        .select('email, name, role, state, district, phone, is_active')
        .order('name')
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

    console.log(`[Admin Users API] Fetched ${allUsers.length} users out of ${count} total`);

    return NextResponse.json({ 
      success: true, 
      users: allUsers, 
      total: count || allUsers.length,
      fetched: allUsers.length 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'PM')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, name, role, state, district, phone } = body;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        email,
        name,
        role,
        state: state === 'All' ? null : state,
        district: district || null,
        phone: phone || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, user: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'PM')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, name, role, state, district, phone } = body;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name,
        role,
        state: state === 'All' ? null : state,
        district: district || null,
        phone: phone || null,
      })
      .eq('email', email)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, user: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'PM')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email } = body;

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('email', email);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
