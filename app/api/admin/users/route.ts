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
    const { data, error } = await supabase
      .from('profiles')
      .select('email, name, role, state, district, phone, is_active')
      .order('name');

    if (error) throw error;

    return NextResponse.json({ success: true, users: data });
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
