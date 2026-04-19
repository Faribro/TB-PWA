import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase-server-admin';
import { normalizeRole, Role } from '@/lib/constants/roles';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const EXPORT_COLUMNS = [
  'id', 'unique_id', 'inmate_name', 'screening_date', 'submitted_on',
  'screening_state', 'screening_district', 'facility_name', 'facility_type',
  'xray_result', 'tb_diagnosed', 'tb_type', 'att_start_date', 'att_completion_date',
  'referral_date', 'referred_facility', 'hiv_status', 'art_status', 'art_number',
  'sex', 'age', 'date_of_birth', 'contact_number', 'address',
  'father_husband_name', 'inmate_type', 'staff_name', 'symptoms_10s',
  'tb_past_history', 'remarks', 'nikshay_abha_id', 'registration_date',
  'tb_diagnosis_date', 'closure_reason', 'created_at', 'updated_at'
].join(',');

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      }, { status: 401 });
    }

    const role = normalizeRole(session.user.role) ?? Role.ME_OFFICER;
    const canExport = [
      Role.ADMIN as string,
      Role.PROGRAM_MANAGER as string,
      Role.STATE_PROGRAM_MANAGER as string,
      Role.ME_OFFICER as string
    ].includes(role);
    
    if (!canExport) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'Export permission denied. Required: Admin, PM, SPM, or ME.' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    const filters = {
      state: searchParams.get('state') || undefined,
      district: searchParams.get('district') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };
    
    const supabase = createServerClient();
    const sessionState = session.user.state;
    const staffName = (session.user as any).staffName;

    console.log(`[patients/export] User: ${session.user.email}, Role: ${role}, Filters:`, filters);

    let query = supabase
      .from('patients')
      .select(EXPORT_COLUMNS)
      .order('screening_date', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false });

    if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
      if (sessionState && sessionState !== 'All') {
        if (sessionState === 'Maharashtra') {
          query = query.in('screening_state', ['Maharashtra', 'Mumbai']);
        } else {
          query = query.eq('screening_state', sessionState);
        }
      }
    } else if (role === Role.PRISON_COORDINATOR) {
      if (staffName) {
        query = query.ilike('staff_name', staffName.trim());
      }
    }

    if (filters.state && filters.state !== 'all') {
      if (filters.state === 'Maharashtra') {
        query = query.in('screening_state', ['Maharashtra', 'Mumbai']);
      } else {
        query = query.eq('screening_state', filters.state);
      }
    }
    
    if (filters.district && filters.district !== 'all') {
      query = query.eq('screening_district', filters.district);
    }
    
    if (filters.dateFrom) {
      query = query.gte('screening_date', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      query = query.lte('screening_date', filters.dateTo);
    }

    const batchSize = 2000;
    const maxRecords = 100000;
    const allRecords: any[] = [];
    let offset = 0;
    let hasMore = true;
    let batches = 0;

    while (hasMore && batches < 50 && allRecords.length < maxRecords) {
      const { data, error } = await query.range(offset, offset + batchSize - 1);
      
      if (error) {
        console.error('[patients/export] Query error:', error);
        return NextResponse.json({ 
          error: 'Database query failed',
          message: error.message
        }, { status: 500 });
      }

      if (data && data.length > 0) {
        allRecords.push(...data);
        batches++;
        offset += data.length;
        hasMore = data.length === batchSize;
        
        console.log(`[patients/export] Batch ${batches}: fetched ${data.length} records (total: ${allRecords.length})`);
        
        if (allRecords.length >= maxRecords) {
          console.warn(`[patients/export] Hit safety cap of ${maxRecords} records`);
          break;
        }
      } else {
        hasMore = false;
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[patients/export] ✅ Exported ${allRecords.length} records in ${batches} batches (${durationMs}ms)`);

    return NextResponse.json({
      data: allRecords,
      meta: {
        total: allRecords.length,
        batches,
        durationMs,
        role,
        filters,
        cappedAt: allRecords.length >= maxRecords ? maxRecords : undefined
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Total-Records': String(allRecords.length),
        'X-Batches': String(batches),
        'X-Duration-Ms': String(durationMs)
      }
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[patients/export] Exception:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
