import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.MED_BACKEND_URL!;
const BACKEND_SECRET = process.env.MED_BACKEND_SECRET!;

export async function GET() {
  if (!BACKEND_URL || !BACKEND_SECRET) {
    return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/orphans`, {
      headers: { Authorization: `Bearer ${BACKEND_SECRET}` },
      signal: AbortSignal.timeout(10_000),
      // Don't cache — this is a live queue
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      return NextResponse.json({ error: `Backend ${res.status}`, detail: text }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[orphans proxy] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
