import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionScope } from '@/lib/session-scope';
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

export async function POST(request: Request) {
  try {
    const scope = await getSessionScope();
    const body = await request.json();
    const { action, rows } = body;

    if (!action || !rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing action or rows list' }, { status: 400 });
    }

    const updatedRecords: any[] = [];

    // Run transaction
    try {
      await prisma.$transaction(async (tx) => {
        // 1. BATCH INSERT
        if (action === 'insert') {
          for (const row of rows) {
            const insertData = parsePayloadDates(row);
            
            // Remove temporary client-side IDs
            if (insertData.id && String(insertData.id).startsWith('NEW_')) {
              delete insertData.id;
            }

            delete insertData.created_at;
            delete insertData.updated_at;

            const created = await tx.patients.create({
              data: {
                ...insertData,
                updated_at: new Date()
              }
            });

            updatedRecords.push(created);

            // Log Audit Snapshot
            await logAudit({
              table_name: 'patients',
              record_id: created.id,
              action: 'INSERT',
              new_data: created,
              changed_by: scope.staffName || 'system'
            });
          }
        }

        // 2. BATCH UPDATE
        if (action === 'update') {
          for (const row of rows) {
            const id = row.id;
            if (!id) {
              throw new Error('Missing patient ID for row update');
            }

            const clientTimestamp = row.updated_at ? new Date(row.updated_at) : null;
            if (!clientTimestamp || isNaN(clientTimestamp.getTime())) {
              throw new Error(`Missing or invalid updated_at timestamp for row ${id}`);
            }

            const existing = await tx.patients.findUnique({ where: { id } });
            if (!existing) {
              throw new Error(`Patient record ${id} not found`);
            }

            const updateData = parsePayloadDates(row);
            delete updateData.id;
            delete updateData.created_at;

            const nextUpdatedAt = new Date();
            updateData.updated_at = nextUpdatedAt;

            // Update with OCC (check matching id and updated_at)
            const updateResult = await tx.patients.updateMany({
              where: {
                id,
                updated_at: clientTimestamp
              },
              data: updateData
            });

            if (updateResult.count === 0) {
              // Throw custom object to handle transaction rollback and conflict details
              throw { isConflict: true, id, existingRow: existing };
            }

            const updated = await tx.patients.findUnique({ where: { id } });
            if (updated) {
              updatedRecords.push(updated);

              // Log Audit Snapshot
              await logAudit({
                table_name: 'patients',
                record_id: id,
                action: 'UPDATE',
                old_data: existing,
                new_data: updated,
                changed_by: scope.staffName || 'system'
              });
            }
          }
        }
      });
    } catch (txErr: any) {
      if (txErr.isConflict) {
        return NextResponse.json({
          success: false,
          conflict: true,
          id: txErr.id,
          currentRow: txErr.existingRow,
          message: `Concurrency conflict detected on row ${txErr.id}`
        }, { status: 409 });
      }
      throw txErr; // rethrow other errors
    }

    // Sync back to Google Sheets (non-blocking)
    try {
      syncLinelist(updatedRecords);
    } catch (syncErr) {
      console.error('[API Linelist BATCH] Background sheets sync error:', syncErr);
    }

    return NextResponse.json({
      success: true,
      patients: updatedRecords,
      message: `Successfully processed ${updatedRecords.length} records`
    });
  } catch (error: any) {
    console.error('[API Linelist BATCH POST] Error:', error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: statusCode });
  }
}
