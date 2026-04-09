import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';
import { normalizeRole, Role } from '@/lib/constants/roles';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface PatientsResponse {
  data: any[];
  count: number;
  cached?: boolean;
  duration?: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    
    const rawRole = session.user.role ?? 'ME';
    const role = normalizeRole(rawRole) ?? Role.ME_OFFICER;
    const state = session.user.state;
    const staffName = (session.user as any).staffName;

    console.log('[/api/patients] User:', session.user.email, 'Role:', role, 'State:', state);

    // Build base query
    let query = supabase.from('patients').select('*', { count: 'exact' });
    
    // Apply RBAC filters
    if (role === Role.ADMIN || role === Role.PROGRAM_MANAGER) {
      // National tier - no filters
      console.log('[/api/patients] Tier: NATIONAL');
    } else if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
      if (state && state !== 'All') {
        query = query.eq('screening_state', state);
        console.log('[/api/patients] Tier: STATE -', state);
      }
    } else if (role === Role.PRISON_COORDINATOR) {
      if (staffName) {
        query = query.ilike('staff_name', staffName.trim());
        console.log('[/api/patients] Tier: FACILITY -', staffName);
      }
    }

    // Fetch data with pagination fallback
    const BATCH_SIZE = 5000;
    let allData: any[] = [];
    let offset = 0;
    let hasMore = true;
    let totalCount = 0;

    while (hasMore) {
      const { data: batch, error, count } = await query
        .range(offset, offset + BATCH_SIZE - 1)
        .order('screening_date', { ascending: false });

      if (error) {
        console.error('[/api/patients] Query error:', error);
        return NextResponse.json({ 
          error: 'Database query failed', 
          details: error.message 
        }, { status: 500 });
      }

      if (count !== null && totalCount === 0) {
        totalCount = count;
      }

      if (batch && batch.length > 0) {
        allData.push(...batch);
        console.log(`[/api/patients] Batch ${Math.floor(offset / BATCH_SIZE) + 1}: ${batch.length} records (total: ${allData.length}/${totalCount})`);
        
        if (batch.length < BATCH_SIZE) {
          hasMore = false;
        } else {
          offset += BATCH_SIZE;
        }
      } else {
        hasMore = false;
      }

      // Safety: prevent infinite loops
      if (offset > 100000) {
        console.warn('[/api/patients] Safety limit reached at 100k records');
        break;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[/api/patients] ✅ Fetched ${allData.length} records in ${duration}ms`);

    const response: PatientsResponse = {
      data: allData,
      count: allData.length,
      duration
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        'X-Total-Count': String(allData.length),
        'X-Duration-Ms': String(duration)
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[/api/patients] Exception:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      duration
    }, { status: 500 });
  }
}
