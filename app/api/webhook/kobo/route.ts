import { NextRequest, NextResponse } from 'next/server'
import { mapKoboPayloadToSupabase } from '@/lib/koboMapper'

export const runtime = 'nodejs'; // Required for waitUntil

// Move ALL potentially-failing imports inside the handler
// to prevent module-load crashes from breaking the route

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

      // Exponential backoff: 500ms, 1000ms, 2000ms
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
    } catch (err: any) {
      console.error(`[webhook] ❌ Attempt ${attempt} exception:`, err.message);
      
      if (attempt === maxAttempts) {
        return { success: false, error: err.message };
      }
      
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
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
    // 1. Validate secret
    const secret = req.headers.get('x-kobo-webhook-secret') 
      ?? req.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!KOBO_WEBHOOK_SECRET) {
      console.error('[webhook] KOBO_WEBHOOK_SECRET env var not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    if (!secret || secret !== KOBO_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse body
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // 3. Validate UUID
    const uuid = body['_uuid'] ?? body['uuid']
    if (!uuid) {
      return NextResponse.json(
        { error: 'Missing required field: _uuid' }, 
        { status: 400 }
      )
    }

    // 4. Background processing task
    const ctx = (req as any)[Symbol.for('vercel.request.context')]
    const processTask = async () => {
      try {
        const transformed: Record<string, any> = mapKoboPayloadToSupabase(body);
        transformed.kobo_uuid = String(uuid);
        transformed.created_at = transformed.created_at ?? new Date().toISOString();
        
        // Initialize Google Sheets sync fields
        transformed.synced_to_sheets = false;
        transformed.sheets_sync_attempts = 0;
        transformed.sheets_sync_error = null;
        transformed.webhook_received_at = new Date().toISOString();

        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
          console.error('[webhook] Missing Supabase env vars')
          return
        }

        const result = await insertWithRetry(SUPABASE_URL, SUPABASE_SERVICE_KEY, transformed, 3);

        if (result.success) {
          console.log('[webhook] ✅ Upserted record:', uuid)
        } else {
          console.error('[webhook] ❌ Failed after retries:', result.error)
        }
      } catch (err: any) {
        console.error('[webhook] Background processing error:', err.message)
      }
    }

    // 5. Use Vercel's waitUntil if available, otherwise fire async
    if (ctx?.waitUntil) {
      ctx.waitUntil(processTask())
    } else {
      processTask() // Non-blocking in dev
    }

    // 6. Return 200 IMMEDIATELY — Kobo is satisfied
    return NextResponse.json({ status: 'queued', uuid: String(uuid) }, { status: 200 })

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
