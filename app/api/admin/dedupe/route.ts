export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseClient } from '@/lib/supabase-server';
import { Role } from '@/lib/constants/roles';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can deduplicate
    const userRole = session.user.role;
    if (userRole !== Role.ADMIN && userRole !== Role.PROGRAM_MANAGER) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'Only admins can run deduplication' 
      }, { status: 403 });
    }

    const supabase = getSupabaseClient();

    // Step 1: Count total patients before
    const { count: beforeCount, error: countError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Step 2: Find duplicates (same id, multiple rows)
    const { data: duplicates, error: dupError } = await supabase
      .rpc('find_duplicate_patients');

    if (dupError) {
      console.error('[dedupe] Error finding duplicates:', dupError);
      return NextResponse.json({ error: dupError.message }, { status: 500 });
    }

    // Step 3: For each duplicate id, keep the most recent row (by updated_at)
    let deletedCount = 0;
    const duplicateIds = duplicates?.map((d: any) => d.id) || [];

    for (const patientId of duplicateIds) {
      // Get all rows for this id, sorted by updated_at desc
      const { data: rows, error: fetchError } = await supabase
        .from('patients')
        .select('id, updated_at, created_at')
        .eq('id', patientId)
        .order('updated_at', { ascending: false });

      if (fetchError || !rows || rows.length <= 1) continue;

      // Keep the first (most recent), delete the rest
      const toDelete = rows.slice(1);
      
      for (const row of toDelete) {
        const { error: delError } = await supabase
          .from('patients')
          .delete()
          .eq('id', row.id)
          .lt('updated_at', rows[0].updated_at); // Safety: only delete older rows

        if (!delError) {
          deletedCount++;
        }
      }
    }

    // Step 4: Count after
    const { count: afterCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    console.log(`[dedupe] ✅ Removed ${deletedCount} duplicates. Before: ${beforeCount}, After: ${afterCount}`);

    return NextResponse.json({
      success: true,
      before: beforeCount,
      after: afterCount,
      deleted: deletedCount,
      duplicateIds: duplicateIds.length,
      message: `Removed ${deletedCount} duplicate rows. ${afterCount} patients remain.`
    });

  } catch (err) {
    console.error('[dedupe] Exception:', err);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
