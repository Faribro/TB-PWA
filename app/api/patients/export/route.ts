import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { normalizeRole, Role } from '@/lib/constants/roles';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// All exportable columns aligned with the actual Prisma schema
const EXPORT_SELECT = {
  id: true,
  unique_id: true,
  kobo_uuid: true,
  inmate_name: true,
  father_husband_name: true,
  date_of_birth: true,
  age: true,
  sex: true,
  contact_number: true,
  address: true,
  inmate_type: true,
  screening_date: true,
  submitted_on: true,
  screening_state: true,
  screening_district: true,
  facility_name: true,
  facility_type: true,
  staff_name: true,
  symptoms_10s: true,
  tb_past_history: true,
  xray_result: true,
  referral_date: true,
  referred_facility: true,
  tb_diagnosed: true,
  tb_diagnosis_date: true,
  tb_type: true,
  att_start_date: true,
  att_completion_date: true,
  treatment_regimen: true,
  hiv_status: true,
  art_status: true,
  art_number: true,
  nikshay_abha_id: true,
  registration_date: true,
  closure_reason: true,
  remarks: true,
  ai_link_status: true,
  other_facility_name: true,
  created_at: true,
  updated_at: true,
} as const;

function getPrismaStateConditions(state: string) {
  const normalized = state.toLowerCase().replace(/[_\s]+/g, '');
  switch (normalized) {
    case 'maharashtra':
    case 'mumbai':
      return {
        OR: [
          { screening_state: { contains: 'maharashtra', mode: 'insensitive' as const } },
          { screening_state: { contains: 'mumbai', mode: 'insensitive' as const } },
        ],
      };
    case 'madhyapradesh':
      return { screening_state: { equals: 'Madhya Pradesh' } };
    case 'uttarakhand':
    case 'uttaranchal':
      return { screening_state: { equals: 'Uttarakhand' } };
    case 'gujarat':
      return { screening_state: { equals: 'Gujarat' } };
    case 'chandigarh':
      return { screening_state: { equals: 'Chandigarh' } };
    default:
      return { screening_state: { contains: state, mode: 'insensitive' as const } };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const role = normalizeRole(session.user.role) ?? Role.ME_OFFICER;
    const canExport = [
      Role.ADMIN as string,
      Role.PROGRAM_MANAGER as string,
      Role.STATE_PROGRAM_MANAGER as string,
      Role.ME_OFFICER as string,
    ].includes(role);

    if (!canExport) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Export permission denied. Required: Admin, PM, SPM, or ME.',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const filterState      = searchParams.get('state')        || undefined;
    const filterDistrict   = searchParams.get('district')     || undefined;
    const filterDateFrom   = searchParams.get('dateFrom')     || undefined;
    const filterDateTo     = searchParams.get('dateTo')       || undefined;
    const filterFacility   = searchParams.get('facilityType') || undefined;
    const filterSearch     = searchParams.get('search')       || undefined;
    const filterSuspected  = searchParams.get('suspected')    || undefined;
    const filterTbDiag     = searchParams.get('tbDiagnosed')  || undefined;

    const sessionState = session.user.state;
    const staffName    = (session.user as any).staffName;

    console.log(`[patients/export] User: ${session.user.email}, Role: ${role}, Filters:`, {
      filterState, filterDistrict, filterDateFrom, filterDateTo,
      filterFacility, filterSearch, filterSuspected, filterTbDiag,
    });

    // ── Build Prisma WHERE clause ─────────────────────────────────────────────
    const where: any = { AND: [] };

    // 1. RBAC scope enforcement
    if (role === Role.STATE_PROGRAM_MANAGER || role === Role.ME_OFFICER) {
      if (sessionState && sessionState !== 'All') {
        where.AND.push(getPrismaStateConditions(sessionState));
      }
    } else if (role === Role.PRISON_COORDINATOR) {
      if (staffName) {
        where.AND.push({
          staff_name: { equals: staffName.trim(), mode: 'insensitive' },
        });
      }
    }
    // ADMIN / PROGRAM_MANAGER: no additional RBAC filter

    // 2. User-applied filters
    if (filterState && filterState !== 'all') {
      where.AND.push(getPrismaStateConditions(filterState));
    }
    if (filterDistrict && filterDistrict !== 'all') {
      where.AND.push({ screening_district: { equals: filterDistrict } });
    }
    if (filterDateFrom) {
      where.AND.push({ screening_date: { gte: new Date(filterDateFrom) } });
    }
    if (filterDateTo) {
      where.AND.push({ screening_date: { lte: new Date(filterDateTo) } });
    }
    if (filterFacility && filterFacility !== 'all') {
      where.AND.push({ facility_type: { equals: filterFacility } });
    }
    if (filterSearch) {
      const q = filterSearch.trim();
      where.AND.push({
        OR: [
          { inmate_name: { contains: q, mode: 'insensitive' } },
          { unique_id:   { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (filterSuspected && filterSuspected !== 'all') {
      if (filterSuspected === 'Yes') {
        where.AND.push({
          OR: [
            { xray_result: { contains: 'abnormal',  mode: 'insensitive' } },
            { xray_result: { contains: 'suspected', mode: 'insensitive' } },
          ],
        });
      } else if (filterSuspected === 'No') {
        where.AND.push({ xray_result: { contains: 'normal', mode: 'insensitive' } });
      } else {
        where.AND.push({ xray_result: { equals: filterSuspected } });
      }
    }
    if (filterTbDiag && filterTbDiag !== 'all') {
      if (filterTbDiag.toLowerCase() === 'pending') {
        where.AND.push({ tb_diagnosed: null });
      } else {
        where.AND.push({ tb_diagnosed: { equals: filterTbDiag } });
      }
    }

    // Clean up empty AND array
    if (where.AND.length === 0) delete where.AND;

    // ── Single Prisma query (no range loops) ──────────────────────────────────
    const records = await prisma.patients.findMany({
      where,
      select: EXPORT_SELECT,
      orderBy: [{ screening_date: 'desc' }, { id: 'desc' }],
    });

    const durationMs = Date.now() - startTime;
    console.log(
      `[patients/export] ✅ Exported ${records.length} records via Prisma in ${durationMs}ms`
    );

    return NextResponse.json(
      {
        data: records,
        meta: {
          total: records.length,
          durationMs,
          role,
          filters: { filterState, filterDistrict, filterDateFrom, filterDateTo, filterFacility, filterSearch, filterSuspected, filterTbDiag },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Total-Records': String(records.length),
          'X-Duration-Ms': String(durationMs),
        },
      }
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[patients/export] Exception:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
