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

    // Parse pagination params - Vercel-friendly defaults
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(1000, Math.max(1, parseInt(searchParams.get('pageSize') ?? '100', 10)));
    const offset = (page - 1) * pageSize;
    
    // Limit total fetch for Vercel serverless (max 5000 records to prevent timeout)
    const maxRecords = Math.min(pageSize, 5000);

    const supabase = createServerClient();
    
    const rawRole = session.user.role ?? 'ME';
    const role = normalizeRole(rawRole) ?? Role.ME_OFFICER;
    const state = session.user.state;
    const staffName = (session.user as any).staffName;

    console.log(`[/api/patients] User: ${session.user.email}, Role: ${role}, Page: ${page}, PageSize: ${pageSize}`);

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

    // Fetch single page (Vercel-safe - no batching loops)
    let dataQuery = supabase
      .from('patients')
      .select('*')
      .range(offset, offset + maxRecords - 1)
      .order('screening_date', { ascending: false });
    
    dataQuery = applyFilters(dataQuery);
    const { data, error } = await dataQuery;

    if (error) {
      console.error('[/api/patients] Query error:', error);
      return NextResponse.json({ error: 'Database query failed', details: error.message }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    const totalPages = Math.ceil((totalCount || 0) / pageSize);
    
    console.log(`[/api/patients] ✅ Page ${page}/${totalPages}: ${data?.length || 0} records (${duration}ms)`);

    const response = {
      data: data || [],
      count: data?.length || 0,
      totalCount: totalCount || 0,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
      duration,
      _meta: {
        role,
        state: state || null,
        tier: role === Role.ADMIN || role === Role.PROGRAM_MANAGER ? 'NATIONAL' : 
              role === Role.PRISON_COORDINATOR ? 'FACILITY' : 'STATE'
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
