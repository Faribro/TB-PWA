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

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const requestedPageSize = parseInt(searchParams.get('pageSize') ?? '100', 10);
    
    const supabase = createServerClient();
    
    const rawRole = session.user.role ?? 'ME';
    const role = normalizeRole(rawRole) ?? Role.ME_OFFICER;
    const state = session.user.state;
    const staffName = (session.user as any).staffName;
    
    // Limit total fetch based on role (max 20000 for admin/PM, 5000 for others)
    // Supabase has hard limit of 1000 per query, so we batch fetch
    const maxRecords = role === Role.ADMIN || role === Role.PROGRAM_MANAGER 
      ? Math.min(requestedPageSize, 20000) 
      : Math.min(requestedPageSize, 5000);
    
    const batchSize = 1000; // Supabase max per query
    const offset = (page - 1) * maxRecords; // Offset based on requested page size

    console.log(`[/api/patients] User: ${session.user.email}, Role: ${role}, Requested: ${requestedPageSize}, Max: ${maxRecords}, BatchSize: ${batchSize}`);

    // Build base query with filters applied to both count and data
    const applyFilters = (query: any) => {
      if (role === Role.ADMIN || role === Role.PROGRAM_MANAGER) {
        // National tier - no filters
      } else if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
        if (state && state !== 'All') {
          query = query.eq('screening_state', state);
        }
      } else if (role === Role.PRISON_COORDINATOR) {
        if (staffName) {
          query = query.ilike('staff_name', staffName.trim());
        }
      }
      return query;
    };

    // Get filtered count
    let countQuery = supabase.from('patients').select('*', { count: 'exact', head: true });
    countQuery = applyFilters(countQuery);
    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('[/api/patients] Count error:', countError);
      return NextResponse.json({ error: 'Database error', details: countError.message }, { status: 500 });
    }

    // Fetch data - for large datasets, we need to batch fetch
    // Supabase has a hard limit of 1000 rows per request
    let allData: any[] = [];
    let fetchOffset = offset;
    const totalToFetch = Math.min(maxRecords, (totalCount || 0) - offset);
    
    while (allData.length < totalToFetch) {
      const remainingToFetch = totalToFetch - allData.length;
      const currentBatchSize = Math.min(batchSize, remainingToFetch);
      
      let batchQuery = supabase
        .from('patients')
        .select('*')
        .range(fetchOffset, fetchOffset + currentBatchSize - 1)
        .order('screening_date', { ascending: false });
      
      batchQuery = applyFilters(batchQuery);
      const { data: batchData, error: batchError } = await batchQuery;
      
      if (batchError) {
        console.error('[/api/patients] Batch query error:', batchError);
        return NextResponse.json({ error: 'Database query failed', details: batchError.message }, { status: 500 });
      }
      
      if (!batchData || batchData.length === 0) break;
      
      allData = allData.concat(batchData);
      fetchOffset += batchData.length;
      
      // Safety break
      if (batchData.length < currentBatchSize) break;
    }
    
    const data = allData;

    const duration = Date.now() - startTime;
    const totalPages = Math.ceil((totalCount || 0) / requestedPageSize);
    
    console.log(`[/api/patients] ✅ Fetched ${data?.length || 0}/${totalCount} records (${duration}ms)`);

    const response = {
      data: data || [],
      count: data?.length || 0,
      totalCount: totalCount || 0,
      page,
      pageSize: requestedPageSize,
      totalPages,
      hasMore: page < totalPages,
      duration,
      _meta: {
        role,
        state: state || null,
        tier: role === Role.ADMIN || role === Role.PROGRAM_MANAGER ? 'NATIONAL' : 
              role === Role.PRISON_COORDINATOR ? 'FACILITY' : 'STATE',
        batchSize,
        maxFetched: maxRecords
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        'X-Total-Count': String(totalCount || 0),
        'X-Page': String(page),
        'X-Total-Pages': String(totalPages)
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
