import { NextRequest, NextResponse } from 'next/server'
import { mapKoboPayloadToSupabase } from '@/lib/koboMapper'
import { getSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const KOBO_WEBHOOK_SECRET = process.env.KOBO_WEBHOOK_SECRET;
const GOOGLE_SCRIPT_WEBHOOK_URL = process.env.GOOGLE_SCRIPT_WEBHOOK_URL;

// Allowed origins for KoboToolbox webhooks
const KOBO_CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://kf.kobotoolbox.org',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-kobo-webhook-secret',
} as const;

async function upsertWithRetry(
  data: Record<string, unknown>,
  maxAttempts = 3
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { error } = await supabase
        .from('patients')
        .upsert(data, { onConflict: 'kobo_uuid' });

      if (!error) return { success: true };

      console.error(`[webhook] Attempt ${attempt} failed:`, error.message);
      if (attempt === maxAttempts) return { success: false, error: error.message };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[webhook] Attempt ${attempt} exception:`, msg);
      if (attempt === maxAttempts) return { success: false, error: msg };
    }

    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
  }

  return { success: false, error: 'Max retries exceeded' };
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'SAMADHAAN Kobo Webhook',
    timestamp: new Date().toISOString(),
  });
}

// Webhook receiver
export async function POST(req: NextRequest) {
  try {
    // Validate secret
    if (!KOBO_WEBHOOK_SECRET) {
      console.error('[webhook] KOBO_WEBHOOK_SECRET not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const secret =
      req.headers.get('x-kobo-webhook-secret') ??
      req.headers.get('authorization')?.replace('Bearer ', '');

    if (!secret || secret !== KOBO_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate UUID
    const uuid = body['_uuid'] ?? body['uuid'];
    if (!uuid) {
      return NextResponse.json({ error: 'Missing required field: _uuid' }, { status: 400 });
    }

    // Map payload
    const transformed: Record<string, unknown> = mapKoboPayloadToSupabase(body);
    transformed.created_at ??= new Date().toISOString();
    transformed.synced_to_sheets = false;
    transformed.sheets_sync_attempts = 0;
    transformed.sheets_sync_error = null;
    transformed.webhook_received_at = new Date().toISOString();

    // Upsert via singleton client
    const result = await upsertWithRetry(transformed, 3);

    if (result.success) {
      // Fire-and-forget Sheets sync
      if (GOOGLE_SCRIPT_WEBHOOK_URL) {
        fetch(GOOGLE_SCRIPT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...transformed, _raw: body }),
        }).catch((err) => console.error('[webhook] Sheets sync failed:', err));
      }

      return NextResponse.json(
        { status: 'success', uuid: String(uuid), sheets_sync: 'queued' },
        { status: 200, headers: KOBO_CORS_HEADERS }
      );
    }

    // Return 200 to prevent KoboToolbox retry spam on permanent failures
    console.error('[webhook] Upsert failed after retries:', result.error);
    return NextResponse.json(
      { status: 'failed', uuid: String(uuid), error: result.error },
      { status: 200, headers: KOBO_CORS_HEADERS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[webhook] Unhandled error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: KOBO_CORS_HEADERS });
}
