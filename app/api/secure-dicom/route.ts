import { NextRequest, NextResponse } from 'next/server';

// These are SERVER-ONLY env vars (no NEXT_PUBLIC_ prefix).
// They are never bundled into client JS.
const BACKEND_URL = process.env.MED_BACKEND_URL!;
const BACKEND_SECRET = process.env.MED_BACKEND_SECRET!;

/**
 * POST /api/secure-dicom
 * Body: { fileName: string }
 *
 * Asks the Rust backend for the resolved file URL (SAS or signed URL),
 * then returns ONLY that URL to the client. The secret never leaves the server.
 */
export async function POST(request: NextRequest) {
  if (!BACKEND_URL || !BACKEND_SECRET) {
    return NextResponse.json({ error: 'Backend not configured' }, { status: 503 });
  }

  let fileName: string;
  try {
    ({ fileName } = await request.json());
    if (!fileName) throw new Error('missing fileName');
  } catch {
    return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/v1/files/${encodeURIComponent(fileName)}/sas`, {
      headers: { Authorization: `Bearer ${BACKEND_SECRET}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => upstream.statusText);
      return NextResponse.json(
        { error: `Backend error: ${upstream.status}`, detail: text },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();

    // The Rust backend returns { url: "https://..." } or { sas_url: "..." }
    const fileUrl: string = data.url ?? data.sas_url ?? data.fileUrl;
    if (!fileUrl) {
      return NextResponse.json({ error: 'Backend returned no URL', raw: data }, { status: 502 });
    }

    return NextResponse.json({ fileUrl });
  } catch (err: any) {
    console.error('[secure-dicom] proxy error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
