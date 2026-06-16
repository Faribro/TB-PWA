import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-server';
import { getSessionScope, type SessionScope } from '@/lib/session-scope';
import { syncToSheetsAsync } from '@/lib/sheetsSyncQStash';
import { sanitizePatientUpdate } from '@/lib/db/sanitizePatientUpdate';
import { mapPatientUpdatesToDb } from '@/lib/db/patientUpdateFields';
import { invalidatePatientCaches } from '@/lib/cache-version';

type PatientIdentifier = {
  idField: 'id' | 'kobo_uuid';
  value: string;
  existing: {
    id: string;
    kobo_uuid: string | null;
    unique_id: string | null;
    inmate_name: string | null;
    screening_state: string | null;
  };
};

const isDev = process.env.NODE_ENV !== 'production';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = String(searchParams.get('patientId') || '').trim();

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_PATIENT_ID' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const resolved = await resolvePatientIdentifier(supabase, patientId);

    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'PATIENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const { data: patient, error: selectError } = await supabase
      .from('patients')
      .select('*')
      .eq(resolved.idField, resolved.value)
      .maybeSingle();

    if (selectError || !patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'DB_REREAD_FAILED',
          detail: selectError?.message || 'No patient found',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, patient }, { status: 200 });
  } catch (error: unknown) {
    console.error('[patient-sync] GET request failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get('authorization');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isServiceRoleAuth =
      Boolean(authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`);

    let scope: SessionScope = {
      state: null,
      district: null,
      role: 'service',
      staffName: null,
    };

    if (!isServiceRoleAuth) {
      try {
        scope = await getSessionScope();
      } catch {
        throw new Error('UNAUTHORIZED');
      }
    }

    const body = await request.json();
    const patientId = String(body?.patientId || '').trim();
    const updates = body?.updates;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_PATIENT_ID' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: 'MISSING_UPDATES' },
        { status: 400 }
      );
    }

    const sanitized = sanitizePatientUpdate(updates);
    const mapped = mapPatientUpdatesToDb(sanitized);
    const dbUpdates = mapped.dbUpdates;

    if (mapped.unmappedClinicalKeys.length > 0 && isDev) {
      console.warn('[patient-sync] Unmapped clinical-like keys:', mapped.unmappedClinicalKeys);
    }

    if (mapped.collisions.length > 0 && isDev) {
      console.warn('[patient-sync] Multiple input keys mapped to the same DB column:', mapped.collisions);
    }

    if (Object.keys(dbUpdates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_MAPPED_FIELDS',
          unmappedKeys: isDev ? mapped.unmappedKeys : undefined,
        },
        { status: 400 }
      );
    }

    dbUpdates.updated_at = new Date().toISOString();

    const supabase = getSupabaseClient();
    const resolved = await resolvePatientIdentifier(supabase, patientId);

    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'PATIENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!isAuthorizedForPatient(isServiceRoleAuth, scope, resolved.existing.screening_state)) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED_STATE_ACCESS' },
        { status: 403 }
      );
    }

    const { data: updateResult, error: dbError } = await supabase
      .from('patients')
      .update(dbUpdates)
      .eq(resolved.idField, resolved.value)
      .select('id, updated_at')
      .maybeSingle();

    if (dbError) {
      return NextResponse.json(
        {
          success: false,
          error: 'DB_WRITE_FAILED',
          detail: dbError.message,
          hint: dbError.hint,
          code: dbError.code,
          updates: Object.keys(dbUpdates),
        },
        { status: 500 }
      );
    }

    if (!updateResult) {
      return NextResponse.json(
        {
          success: false,
          error: 'DB_WRITE_NO_ROW',
          updates: Object.keys(dbUpdates),
        },
        { status: 409 }
      );
    }

    const { data: updatedPatient, error: selectError } = await supabase
      .from('patients')
      .select('*')
      .eq(resolved.idField, resolved.value)
      .maybeSingle();

    if (selectError || !updatedPatient) {
      return NextResponse.json(
        {
          success: false,
          error: 'DB_REREAD_FAILED',
          detail: selectError?.message || 'No patient returned after update',
        },
        { status: 500 }
      );
    }

    invalidatePatientCaches().catch((error) => {
      if (isDev) console.error('[patient-sync] Cache invalidation failed:', error);
    });
    
    // Clear all bulk patients cache keys
    try {
      const { invalidatePattern } = await import('@/lib/redis');
      console.log('[patient-sync] Clearing bulk patient cache keys with pattern: patients:bulk:*');
      await invalidatePattern('patients:bulk:*');
    } catch (cacheError) {
      console.warn('[patient-sync] Failed to clear bulk cache:', cacheError);
    }
    syncToSheetsAsync(updatedPatient, 'update');

    const duration = Date.now() - startTime;
    console.info('[patient-sync] update persisted', {
      duration,
      idField: resolved.idField,
      fieldCount: Object.keys(dbUpdates).length,
      unmappedCount: mapped.unmappedKeys.length,
    });

    return NextResponse.json(
      {
        success: true,
        patient: updatedPatient,
        _perf: { duration },
        diagnostics: isDev
          ? {
              mappedFields: Object.keys(dbUpdates),
              unmappedKeys: mapped.unmappedKeys,
              collisions: mapped.collisions,
            }
          : undefined,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error('[patient-sync] request failed', {
      duration,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}

async function resolvePatientIdentifier(
  supabase: ReturnType<typeof getSupabaseClient>,
  patientId: string
): Promise<PatientIdentifier | null> {
  const columns = 'id, kobo_uuid, unique_id, inmate_name, screening_state';

  const byKobo = await supabase
    .from('patients')
    .select(columns)
    .eq('kobo_uuid', patientId)
    .maybeSingle();

  if (byKobo.data && !byKobo.error) {
    return {
      idField: 'kobo_uuid',
      value: patientId,
      existing: byKobo.data as PatientIdentifier['existing'],
    };
  }

  const byId = await supabase
    .from('patients')
    .select(columns)
    .eq('id', patientId)
    .maybeSingle();

  if (byId.data && !byId.error) {
    return {
      idField: 'id',
      value: patientId,
      existing: byId.data as PatientIdentifier['existing'],
    };
  }

  return null;
}

function isAuthorizedForPatient(
  isServiceRoleAuth: boolean,
  scope: SessionScope,
  patientState: string | null
) {
  if (isServiceRoleAuth) return true;
  if (scope.role === 'admin' || scope.role === 'Program Manager' || scope.role === 'PM') {
    return true;
  }
  return !scope.state || patientState === scope.state;
}
