import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';
import { normalizeRole, Role } from '@/lib/constants/roles';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    
    // Normalize role for RBAC
    const rawRole = session.user.role ?? 'ME';
    const role = normalizeRole(rawRole) ?? Role.ME_OFFICER;
    const state = session.user.state;
    const district = (session.user as any).district;
    const staffName = (session.user as any).staffName;

    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`[/api/patients] REQUEST START`);
    console.log(`  User: ${session.user.email}`);
    console.log(`  Role: ${rawRole} → ${role}`);
    console.log(`  State: ${state}`);

    // Build base query with filters
    const applyFilters = (query: any) => {
      if (role === Role.ADMIN || role === Role.PROGRAM_MANAGER) {
        console.log('  Tier: NATIONAL (no filters)');
        // No filters - fetch ALL records
      } else if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
        if (state && state !== 'All') {
          query = query.eq('screening_state', state);
          console.log(`  Tier: STATE (filter: ${state})`);
        }
      } else if (role === Role.PRISON_COORDINATOR) {
        if (staffName) {
          query = query.ilike('staff_name', staffName.trim());
          console.log(`  Tier: FACILITY (filter: ${staffName})`);
        }
      }
      return query;
    };

    // Get total count first
    let countQuery = supabase.from('patients').select('*', { count: 'exact', head: true });
    countQuery = applyFilters(countQuery);
    const { count: totalCount } = await countQuery;
    
    console.log(`  Total count: ${totalCount}`);

    if (!totalCount || totalCount === 0) {
      console.log('[/api/patients] No records found');
      console.log('═══════════════════════════════════════════════════════════════════════════');
      return NextResponse.json({ data: [], count: 0 });
    }

    // Fetch ALL data in batches to avoid Supabase 1000 row limit
    const batchSize = 1000;
    const batches = Math.ceil(totalCount / batchSize);
    const allData: any[] = [];

    console.log(`  Fetching ${batches} batches of ${batchSize} records each...`);

    for (let i = 0; i < batches; i++) {
      let batchQuery = supabase
        .from('patients')
        .select('*')
        .range(i * batchSize, (i + 1) * batchSize - 1);
      
      batchQuery = applyFilters(batchQuery);

      const { data: batchData, error: batchError } = await batchQuery;

      if (batchError) {
        console.error(`  ❌ Batch ${i + 1}/${batches} error:`, batchError);
        continue;
      }

      if (batchData && batchData.length > 0) {
        allData.push(...batchData);
        console.log(`  📦 Batch ${i + 1}/${batches}: ${batchData.length} records (total: ${allData.length})`);
      }
    }

    const duration = Date.now() - startTime;
    
    console.log(`  ✅ Fetched ${allData.length}/${totalCount} records in ${duration}ms`);
    console.log('═══════════════════════════════════════════════════════════════════════════');

    return NextResponse.json({ 
      data: allData, 
      count: allData.length
    });
  } catch (error) {
    console.error('[/api/patients] Error:', error);
    console.log('═══════════════════════════════════════════════════════════════════════════');
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
