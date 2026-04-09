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
    console.log(`  District: ${district}`);
    console.log(`  Staff: ${staffName}`);

    // Step 1: Get total count
    let countQuery = supabase.from('patients').select('*', { count: 'exact', head: true });

    // Apply 3-tier data isolation
    if (role === Role.ADMIN || role === Role.PROGRAM_MANAGER) {
      console.log('  Tier: NATIONAL (no filters)');
    } else if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
      if (state && state !== 'All') {
        countQuery = countQuery.eq('screening_state', state);
        console.log(`  Tier: STATE (filter: ${state})`);
      }
    } else if (role === Role.PRISON_COORDINATOR) {
      if (staffName) {
        countQuery = countQuery.ilike('staff_name', staffName.trim());
        console.log(`  Tier: FACILITY (filter: ${staffName})`);
      }
    }

    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('[/api/patients] Count error:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if (!count || count === 0) {
      console.log('[/api/patients] No records found');
      console.log('═══════════════════════════════════════════════════════════════════════════');
      return NextResponse.json({ data: [], count: 0 });
    }

    console.log(`  Total count: ${count}`);

    // Step 2: Fetch all records in batches
    const batchSize = 1000;
    const pages = Math.ceil(count / batchSize);
    const allData: any[] = [];

    console.log(`  Fetching ${pages} batches...`);

    for (let i = 0; i < pages; i++) {
      let query = supabase
        .from('patients')
        .select('*')
        .range(i * batchSize, (i + 1) * batchSize - 1);

      // Apply same filters
      if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
        if (state && state !== 'All') {
          query = query.eq('screening_state', state);
        }
      } else if (role === Role.PRISON_COORDINATOR) {
        if (staffName) {
          query = query.ilike('staff_name', staffName.trim());
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error(`  ❌ Batch ${i + 1}/${pages} error:`, error);
        continue;
      }

      if (data) {
        allData.push(...data);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`  ✅ Fetched ${allData.length}/${count} records in ${duration}ms`);
    console.log('═══════════════════════════════════════════════════════════════════════════');

    return NextResponse.json({ data: allData, count });
  } catch (error) {
    console.error('[/api/patients] Error:', error);
    console.log('═══════════════════════════════════════════════════════════════════════════');
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
