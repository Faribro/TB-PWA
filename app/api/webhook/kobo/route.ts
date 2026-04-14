import { NextRequest, NextResponse, after } from 'next/server'
import { mapKoboPayloadToSupabase } from '@/lib/koboMapper'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const KOBO_WEBHOOK_SECRET = process.env.KOBO_WEBHOOK_SECRET
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Retry helper with exponential backoff
 */
async function insertWithRetry(url: string, serviceKey: string, data: any, maxAttempts = 3): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(
        `${url}/rest/v1/patients`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Prefer': 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(data),
        }
      );

      if (res.ok) {
        console.log(`[webhook] ✅ Upsert successful on attempt ${attempt}`);
        return { success: true };
      }

      const errText = await res.text();
      console.error(`[webhook] ❌ Attempt ${attempt} failed:`, errText);

      if (attempt === maxAttempts) {
        return { success: false, error: errText };
      }

      // Exponential backoff: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    } catch (err: any) {
      console.error(`[webhook] ❌ Attempt ${attempt} exception:`, err.message);
      
      if (attempt === maxAttempts) {
        return { success: false, error: err.message };
      }
      
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  
  return { success: false, error: 'Max retries exceeded' };
}

// Health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'SAMADHAAN Kobo Webhook',
    timestamp: new Date().toISOString(),
  })
}

// Webhook receiver
export async function POST(req: NextRequest) {
  try {
    // 1. Validate env vars
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('[webhook] ❌ Missing Supabase env vars')
      return NextResponse.json(
        { error: 'Server configuration error' }, 
        { status: 500 }
      )
    }

    // 2. Validate secret
    const secret = req.headers.get('x-kobo-webhook-secret') 
      ?? req.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!KOBO_WEBHOOK_SECRET) {
      console.error('[webhook] KOBO_WEBHOOK_SECRET env var not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    if (!secret || secret !== KOBO_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Parse body
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // 4. Validate UUID
    const uuid = body['_uuid'] ?? body['uuid']
    if (!uuid) {
      return NextResponse.json(
        { error: 'Missing required field: _uuid' }, 
        { status: 400 }
      )
    }

    // 5. Build transformed payload
    const transformed: Record<string, any> = mapKoboPayloadToSupabase(body);
    transformed.kobo_uuid = String(uuid);
    transformed.created_at = transformed.created_at ?? new Date().toISOString();
    transformed.synced_to_sheets = false;
    transformed.sheets_sync_attempts = 0;
    transformed.sheets_sync_error = null;
    transformed.webhook_received_at = new Date().toISOString();

    console.log('[webhook] 📊 Mapped fields:', Object.keys(transformed).join(', '));

    // 6. Background processing with after()
    after(async () => {
      console.log('[webhook] 🔄 Processing UUID:', uuid);
      const result = await insertWithRetry(
        SUPABASE_URL!, 
        SUPABASE_SERVICE_KEY!, 
        transformed, 
        3
      );
      if (result.success) {
        console.log('[webhook] ✅ Upserted:', uuid);
      } else {
        console.error('[webhook] ❌ Failed after retries:', result.error);
      }
    });

    // 7. Return 200 immediately
    return NextResponse.json(
      { status: 'queued', uuid: String(uuid) },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-kobo-webhook-secret',
        },
      }
    )

  } catch (err) {
    // Catch-all
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[webhook] Unhandled error:', message)
    return NextResponse.json(
      { error: 'Internal server error', message }, 
      { status: 500 }
    )
  }
}

// CORS preflight handler
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-kobo-webhook-secret, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
