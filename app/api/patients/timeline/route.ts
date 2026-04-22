import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    // Get last 50 records from April 21-22, 2026
    const april21Start = '2026-04-21T00:00:00.000Z';
    const april23Start = '2026-04-23T00:00:00.000Z';

    const { data: records, error, count } = await supabase
      .from('patients')
      .select('created_at, inmate_name, screening_state, screening_district, kobo_uuid', { count: 'exact' })
      .gte('created_at', april21Start)
      .lt('created_at', april23Start)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[timeline] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch timeline data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      records: records || [],
      total: count || 0
    });
  } catch (error) {
    console.error('[timeline] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
