import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WEBHOOK_SECRET = 'alliance_kobo_secure_2026';

export async function GET(req: NextRequest) {
  try {
    // Security: Verify webhook secret
    const secret = req.headers.get('x-kobo-webhook-secret');
    if (secret !== WEBHOOK_SECRET) {
      console.error('[UUID Lookup] Unauthorized: Invalid webhook secret');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    console.log('[UUID Lookup] Fetching existing kobo_uuids from Supabase...');

    // Fetch all kobo_uuids in batches to handle large datasets
    const batchSize = 1000;
    const allUUIDs: string[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('patients')
        .select('kobo_uuid')
        .not('kobo_uuid', 'is', null) // Only get non-null UUIDs
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('[UUID Lookup] Supabase query failed:', error);
        return NextResponse.json(
          { 
            error: 'Database Error', 
            message: error.message,
            details: error.details,
          },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        // Extract UUIDs and add to array
        const uuids = data.map(row => row.kobo_uuid).filter(Boolean);
        allUUIDs.push(...uuids);
        
        hasMore = data.length === batchSize;
        offset += batchSize;
      } else {
        hasMore = false;
      }
    }

    console.log(`[UUID Lookup] ✅ Found ${allUUIDs.length} existing kobo_uuids`);

    // Return flat array of UUID strings
    return NextResponse.json(allUUIDs, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error: any) {
    console.error('[UUID Lookup] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// POST endpoint for batch UUID checking (optional - for large datasets)
export async function POST(req: NextRequest) {
  try {
    // Security: Verify webhook secret
    const secret = req.headers.get('x-kobo-webhook-secret');
    if (secret !== WEBHOOK_SECRET) {
      console.error('[UUID Lookup] Unauthorized: Invalid webhook secret');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    // Parse payload - expecting array of UUIDs to check
    const body = await req.json();
    
    if (!Array.isArray(body)) {
      console.error('[UUID Lookup] Bad Request: Payload must be an array of UUIDs');
      return NextResponse.json(
        { error: 'Bad Request', message: 'Payload must be an array of UUID strings' },
        { status: 400 }
      );
    }

    if (body.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    console.log(`[UUID Lookup] Checking ${body.length} UUIDs against database...`);

    // Query Supabase for matching UUIDs
    const { data, error } = await supabase
      .from('patients')
      .select('kobo_uuid')
      .in('kobo_uuid', body);

    if (error) {
      console.error('[UUID Lookup] Supabase query failed:', error);
      return NextResponse.json(
        { 
          error: 'Database Error', 
          message: error.message,
          details: error.details,
        },
        { status: 500 }
      );
    }

    // Extract existing UUIDs
    const existingUUIDs = data ? data.map(row => row.kobo_uuid).filter(Boolean) : [];

    console.log(`[UUID Lookup] ✅ Found ${existingUUIDs.length} existing UUIDs out of ${body.length} checked`);

    // Return flat array of existing UUID strings
    return NextResponse.json(existingUUIDs, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error: any) {
    console.error('[UUID Lookup] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
