import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.MED_BACKEND_URL!;
const BACKEND_SECRET = process.env.MED_BACKEND_SECRET!;

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  if (!BACKEND_URL || !BACKEND_SECRET) {
    return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
  }

  let patient_id: string, blob_name: string;
  try {
    ({ patient_id, blob_name } = await req.json());
    if (!patient_id || !blob_name) throw new Error('missing fields');
  } catch {
    return NextResponse.json({ error: 'patient_id and blob_name are required' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/v1/link-manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BACKEND_SECRET}`,
      },
      body: JSON.stringify({ patient_id, blob_name }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => upstream.statusText);
      return NextResponse.json({ error: text }, { status: upstream.status });
    }

    // Mark patient as human_verified in Supabase
    const sb = serviceClient();
    await sb
      .from('patients')
      .update({ ai_link_status: 'human_verified' })
      .eq('id', patient_id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[link-file] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
