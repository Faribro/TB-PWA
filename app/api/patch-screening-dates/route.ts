import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server-admin';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

interface PatchRecord {
  kobo_uuid: string;
  submitted_on: string | null;
  screening_date: string;
}

export async function POST(req: NextRequest) {
  try {
    // Auth via webhook secret (called from GAS)
    const secret = req.headers.get('x-kobo-webhook-secret');
    
    if (!process.env.KOBO_WEBHOOK_SECRET) {
      console.error('[patch-screening-dates] KOBO_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    if (secret !== process.env.KOBO_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patches } = await req.json();
    
    if (!Array.isArray(patches) || patches.length === 0) {
      return NextResponse.json({ error: 'No patches provided' }, { status: 400 });
    }

    const supabase = createServerClient();
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const patch of patches as PatchRecord[]) {
      if (!patch.kobo_uuid || !patch.screening_date) {
        errors++;
        errorDetails.push(`Missing required fields for patch: ${JSON.stringify(patch)}`);
        continue;
      }
      
      const { error } = await supabase
        .from('patients')
        .update({ 
          submitted_on: patch.submitted_on || null,
          screening_date: patch.screening_date
        })
        .eq('kobo_uuid', patch.kobo_uuid);
      
      if (error) {
        errors++;
        errorDetails.push(`Patch error for ${patch.kobo_uuid}: ${error.message}`);
        console.error('[patch-screening-dates] Error:', patch.kobo_uuid, error.message);
      } else {
        updated++;
      }
    }

    console.log(`[patch-screening-dates] Batch complete: ${updated} updated, ${errors} errors`);

    return NextResponse.json({ 
      success: true,
      updated, 
      errors, 
      total: patches.length,
      errorDetails: errorDetails.length > 0 ? errorDetails.slice(0, 10) : undefined
    });
    
  } catch (error) {
    console.error('[patch-screening-dates] Exception:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
