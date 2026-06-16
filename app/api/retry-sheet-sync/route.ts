import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionScope } from '@/lib/session-scope';

export const maxDuration = 60;

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_WEBHOOK_URL || '';

/**
 * Get Supabase client at request time (not build time)
 */
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  
  try {
    let scope;
    let isServiceRoleAuth = false;
    
    const authHeader = request.headers.get('authorization');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
      isServiceRoleAuth = true;
      scope = { state: null, district: null, role: 'admin' };
    } else {
      try {
        scope = await getSessionScope();
      } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!isServiceRoleAuth && !['admin', 'PM'].includes(scope?.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (!GOOGLE_SCRIPT_URL) {
      return NextResponse.json({ error: 'Configuration missing: GOOGLE_SCRIPT_WEBHOOK_URL' }, { status: 500 });
    }

    // Query Supabase for un-synced entries
    const { data: unsyncedPatients, error: queryError } = await supabase
      .from('patients')
      .select('*')
      .eq('synced_to_sheets', false)
      .lt('sheets_sync_attempts', 3)
      .order('webhook_received_at', { ascending: true })
      .limit(100);

    if (queryError) {
      console.error('[retry-sheet-sync] Query error:', queryError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    if (!unsyncedPatients || unsyncedPatients.length === 0) {
      return NextResponse.json({ retried: 0, succeeded: 0, failed: 0, message: 'No pending syncs' });
    }

    let succeeded = 0;
    let failed = 0;

    for (const patient of unsyncedPatients) {
      try {
        // Post to Google Apps Script
        const gasResponse = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(patient),
        });

        if (!gasResponse.ok) {
          throw new Error(`GAS returned status ${gasResponse.status}`);
        }

        // On Success: Mark synced_to_sheets = true
        await supabase
          .from('patients')
          .update({ synced_to_sheets: true })
          .eq('kobo_uuid', patient.kobo_uuid);
        
        succeeded++;

      } catch (err: any) {
        console.error(`[retry-sheet-sync] Row sync failed for UUID ${patient.kobo_uuid}:`, err.message);
        
        // On Failure: increment attempts and store error
        await supabase
          .from('patients')
          .update({ 
             sheets_sync_attempts: (patient.sheets_sync_attempts || 0) + 1,
             sheets_sync_error: err.message
          })
          .eq('kobo_uuid', patient.kobo_uuid);
        
        failed++;
      }
    }

    return NextResponse.json({
      retried: unsyncedPatients.length,
      succeeded,
      failed
    });

  } catch (error: any) {
    console.error('[retry-sheet-sync] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
