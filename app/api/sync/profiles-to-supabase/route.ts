import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WEBHOOK_SECRET = 'alliance_kobo_secure_2026';

export async function POST(req: NextRequest) {
  try {
    // Security: Verify webhook secret
    const secret = req.headers.get('x-kobo-webhook-secret');
    if (secret !== WEBHOOK_SECRET) {
      console.error('[Profiles Sync] Unauthorized: Invalid webhook secret');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    // Parse payload
    const body = await req.json();
    
    // Handle both direct array and { profiles: [...] } wrapper
    const profilesArray = Array.isArray(body) ? body : body.profiles;
    
    if (!Array.isArray(profilesArray)) {
      console.error('[Profiles Sync] Bad Request: Payload must be an array or { profiles: [...] }');
      return NextResponse.json(
        { error: 'Bad Request', message: 'Payload must be an array of profiles or { profiles: [...] }' },
        { status: 400 }
      );
    }

    if (profilesArray.length === 0) {
      console.warn('[Profiles Sync] Empty payload received');
      return NextResponse.json(
        { success: true, message: 'No profiles to sync', count: 0 },
        { status: 200 }
      );
    }

    console.log(`[Profiles Sync] Received ${profilesArray.length} profiles from Google Sheets`);

    // Validate and filter profiles
    const validProfiles = profilesArray.filter(profile => {
      if (!profile.email || typeof profile.email !== 'string') {
        console.warn('[Profiles Sync] Skipping profile without email');
        return false;
      }
      return true;
    });

    const invalidCount = profilesArray.length - validProfiles.length;

    if (invalidCount > 0) {
      console.warn(`[Profiles Sync] Skipping ${invalidCount} profiles without email`);
    }

    if (validProfiles.length === 0) {
      console.error('[Profiles Sync] No valid profiles to sync (all missing email)');
      return NextResponse.json(
        { error: 'Bad Request', message: 'No valid profiles with email found' },
        { status: 400 }
      );
    }

    console.log(`[Profiles Sync] Upserting ${validProfiles.length} profiles`);

    // Batch processing
    const BATCH_SIZE = 100;
    let processedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < validProfiles.length; i += BATCH_SIZE) {
      const batch = validProfiles.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('profiles')
        .upsert(batch, {
          onConflict: 'email',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`[Profiles Sync] Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
        errors.push(`Batch ${i / BATCH_SIZE + 1}: ${error.message}`);
      } else {
        processedCount += batch.length;
        console.log(`[Profiles Sync] Batch ${i / BATCH_SIZE + 1} complete: ${processedCount}/${validProfiles.length}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Partial Failure', 
          message: `${processedCount}/${validProfiles.length} profiles synced`,
          errors: errors.slice(0, 5),
          stats: {
            received: profilesArray.length,
            synced: processedCount,
            invalid: invalidCount,
          },
        },
        { status: 207 }
      );
    }

    console.log(`[Profiles Sync] ✅ Successfully synced ${processedCount} profiles`);

    return NextResponse.json(
      {
        success: true,
        message: 'Profiles synced successfully',
        stats: {
          received: profilesArray.length,
          synced: processedCount,
          invalid: invalidCount,
        },
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[Profiles Sync] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Supabase connection failed',
          error: error.message,
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      {
        status: 'ok',
        endpoint: '/api/sync/profiles-to-supabase',
        supabase_connected: true,
        test_query_success: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
