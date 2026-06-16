import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionScope } from '@/lib/session-scope';
import { Role } from '@/lib/constants/roles';
import { logAudit } from '@/lib/audit-log';
import { syncLinelist } from '@/lib/sheetsSync';

const DATE_FIELDS = [
  'date_of_birth',
  'screening_date',
  'submitted_on',
  'referral_date',
  'tb_diagnosis_date',
  'att_start_date',
  'att_completion_date',
  'registration_date',
  'sheets_synced_at',
  'created_at',
  'updated_at'
];

function parsePayloadDates(data: any) {
  const result = { ...data };
  for (const key of DATE_FIELDS) {
    if (key in result) {
      if (result[key] === null || result[key] === undefined || result[key] === '') {
        result[key] = null;
      } else {
        const d = new Date(result[key]);
        result[key] = isNaN(d.getTime()) ? null : d;
      }
    }
  }
  return result;
}

export async function GET(request: Request) {
  try {
    const scope = await getSessionScope();
    const { searchParams } = new URL(request.url);
    
    const facilityName = searchParams.get('facility_name');
    const screeningDate = searchParams.get('screening_date');
    const state = searchParams.get('state');
    const district = searchParams.get('district');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 1000);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const cursor = searchParams.get('cursor');

    const where: any = {};

    // Apply geographic scopes from session or filters (enforcing scope restrictions)
    if (state) {
      if (scope.state && scope.state !== state) {
        return NextResponse.json({ success: false, error: 'Forbidden: Out of state scope' }, { status: 403 });
      }
      where.screening_state = state;
    } else if (scope.state) {
      where.screening_state = scope.state;
    }

    if (district) {
      if (scope.district && scope.district !== district) {
        return NextResponse.json({ success: false, error: 'Forbidden: Out of district scope' }, { status: 403 });
      }
      where.screening_district = district;
    } else if (scope.district) {
      where.screening_district = scope.district;
    }

    if (scope.staffName) {
      where.staff_name = {
        contains: scope.staffName,
        mode: 'insensitive'
      };
    }

    // Apply explicit query filters
    if (facilityName) {
      where.facility_name = facilityName;
    }
    if (screeningDate) {
      const parsedDate = new Date(screeningDate);
      if (!isNaN(parsedDate.getTime())) {
        where.screening_date = parsedDate;
      }
    } else if (dateFrom || dateTo) {
      const dateFilter: any = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          dateFilter.gte = fromDate;
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          dateFilter.lte = toDate;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        where.screening_date = dateFilter;
      }
    }

    if (search && search.trim() !== '') {
      where.OR = [
        { inmate_name: { contains: search, mode: 'insensitive' } },
        { father_husband_name: { contains: search, mode: 'insensitive' } },
        { unique_id: { contains: search, mode: 'insensitive' } }
      ];
    }

    const prismaQuery: any = {
      where,
      orderBy: [
        { screening_date: 'desc' as const },
        { inmate_name: 'asc' as const },
        { id: 'desc' as const }
      ],
      take: limit + 1
    };

    if (cursor) {
      prismaQuery.cursor = { id: cursor };
      prismaQuery.skip = 1;
    } else if (offset) {
      prismaQuery.skip = offset;
    }

    const data = await prisma.patients.findMany(prismaQuery);
    const hasMore = data.length === limit + 1;
    const patients = hasMore ? data.slice(0, limit) : data;
    const nextCursor = (hasMore && patients.length > 0) ? patients[patients.length - 1].id : null;

    const total = await prisma.patients.count({ where });

    return NextResponse.json({
      success: true,
      patients,
      total,
      limit,
      offset,
      nextCursor,
      hasMore
    });
  } catch (error: any) {
    console.error('[API Linelist GET] Error:', error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: statusCode });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getSessionScope();
    const body = await request.json();
    const { action, row, clientUpdatedAt } = body;

    if (!action || !row) {
      return NextResponse.json({ success: false, error: 'Missing action or row' }, { status: 400 });
    }

    const id = row.id;

    // 1. DELETE ACTION
    if (action === 'delete') {
      const allowedRoles = [Role.ADMIN, Role.PROGRAM_MANAGER, Role.STATE_PROGRAM_MANAGER];
      if (!allowedRoles.includes(scope.role as any)) {
        return NextResponse.json({ success: false, error: 'Forbidden: Insufficient privileges to delete records' }, { status: 403 });
      }

      if (!id) {
        return NextResponse.json({ success: false, error: 'Missing patient ID for deletion' }, { status: 400 });
      }

      const existingPatient = await prisma.patients.findUnique({ where: { id } });
      if (!existingPatient) {
        return NextResponse.json({ success: false, error: 'Patient record not found' }, { status: 404 });
      }

      // Log Audit Snapshot
      await logAudit({
        table_name: 'patients',
        record_id: id,
        action: 'DELETE',
        old_data: existingPatient,
        changed_by: scope.staffName || 'system'
      });

      // Perform Delete
      await prisma.patients.delete({ where: { id } });

      return NextResponse.json({ success: true, message: 'Record deleted successfully' });
    }

    // 2. INSERT ACTION
    if (action === 'insert') {
      const insertData = parsePayloadDates(row);
      
      // Remove temporary client-side IDs
      if (insertData.id && String(insertData.id).startsWith('NEW_')) {
        delete insertData.id;
      }

      // Clean metadata before inserting
      delete insertData.created_at;
      delete insertData.updated_at;

      const created = await prisma.patients.create({
        data: {
          ...insertData,
          updated_at: new Date()
        }
      });

      // Log Audit Snapshot
      await logAudit({
        table_name: 'patients',
        record_id: created.id,
        action: 'INSERT',
        new_data: created,
        changed_by: scope.staffName || 'system'
      });

      // Sync to Google Sheets (non-blocking)
      try {
        syncLinelist([created]);
      } catch (syncErr) {
        console.error('[API Linelist INSERT] Background sheets sync error:', syncErr);
      }

      return NextResponse.json({ success: true, patient: created });
    }

    // 3. UPDATE ACTION
    if (action === 'update') {
      if (!id) {
        return NextResponse.json({ success: false, error: 'Missing patient ID for update' }, { status: 400 });
      }

      if (!clientUpdatedAt) {
        return NextResponse.json({ success: false, error: 'Missing clientUpdatedAt for optimistic locking' }, { status: 400 });
      }

      const clientTimestamp = new Date(clientUpdatedAt);
      if (isNaN(clientTimestamp.getTime())) {
        return NextResponse.json({ success: false, error: 'Invalid clientUpdatedAt timestamp' }, { status: 400 });
      }

      const existingPatient = await prisma.patients.findUnique({ where: { id } });
      if (!existingPatient) {
        return NextResponse.json({ success: false, error: 'Patient record not found' }, { status: 404 });
      }

      const updateData = parsePayloadDates(row);
      
      // Clean immutable fields
      delete updateData.id;
      delete updateData.created_at;

      // Set new updated_at
      const nextUpdatedAt = new Date();
      updateData.updated_at = nextUpdatedAt;

      // Update with OCC (check matching id and updated_at)
      const updateResult = await prisma.patients.updateMany({
        where: {
          id,
          updated_at: clientTimestamp
        },
        data: updateData
      });

      if (updateResult.count === 0) {
        return NextResponse.json({
          success: false,
          conflict: true,
          currentRow: existingPatient
        }, { status: 409 });
      }

      // Fetch the updated patient
      const updatedPatient = await prisma.patients.findUnique({ where: { id } });
      if (!updatedPatient) {
        return NextResponse.json({ success: false, error: 'Failed to retrieve updated record' }, { status: 500 });
      }

      // Log Audit Snapshot
      await logAudit({
        table_name: 'patients',
        record_id: id,
        action: 'UPDATE',
        old_data: existingPatient,
        new_data: updatedPatient,
        changed_by: scope.staffName || 'system'
      });

      // Sync to Google Sheets (non-blocking)
      try {
        syncLinelist([updatedPatient]);
      } catch (syncErr) {
        console.error('[API Linelist UPDATE] Background sheets sync error:', syncErr);
      }

      return NextResponse.json({ success: true, patient: updatedPatient });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('[API Linelist POST] Error:', error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: statusCode });
  }
}
