/**
 * POST /api/register-reconcile
 *
 * Receives the M&E officer's review decisions for an extraction.
 * Now session-aware: uses selectedDate from reconciliation context,
 * NOT the current system date.
 *
 * For each row, the officer chose: accept (link), create (new), or reject.
 *
 * - "accept" → update existing patient record with extracted data
 * - "create" → insert new patient from extracted data
 * - "reject" → skip row (audit log only)
 *
 * After DB success, triggers Google Sheets sync and surfaces its outcome.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseClient } from '@/lib/supabase-server';

interface RowDecision {
  sno: number;
  action: 'accept' | 'create' | 'reject';
  patientId?: string;
  extractedData: {
    name: string | null;
    father_name: string | null;
    age: number | null;
    ward: string | null;
    address: string | null;
    mobile: string | null;
  };
}

interface ReconcileRequest {
  extractionId: string;
  decisions: RowDecision[];

  /** Session context for date-scoped gap fill */
  sessionContext?: {
    selectedDate?: string;
    facilityName?: string | null;
    screeningDistrict?: string | null;
    screeningState?: string | null;
    scopeMode?: string;
    sessionId?: string;
    isEmptyScope?: boolean;
    scopedCandidateCount?: number;
  };

  /** Legacy flat field (backward compat) */
  screeningDate?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ALLOWED_ROLES = ['PM', 'admin', 'SPM', 'MandE'];
    const userRole = (session.user as any).role ?? '';
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden — Only PM, admin, SPM, and M&E roles can reconcile' },
        { status: 403 },
      );
    }

    const body = (await request.json()) as ReconcileRequest;

    if (!body.extractionId || !body.decisions?.length) {
      return NextResponse.json(
        { error: 'Missing extractionId or decisions array' },
        { status: 400 },
      );
    }

    // ═══════════════════════════════════════════════════════════
    // SCOPE VALIDATION — reject incomplete or invalid scope
    // ═══════════════════════════════════════════════════════════
    const resolvedDate =
      body.sessionContext?.selectedDate ||
      body.screeningDate ||
      null;

    if (!resolvedDate) {
      return NextResponse.json(
        { error: 'screeningDate is required — no date in sessionContext or screeningDate field' },
        { status: 400 },
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(resolvedDate)) {
      return NextResponse.json(
        { error: `screeningDate must be YYYY-MM-DD format, got: ${resolvedDate}` },
        { status: 400 },
      );
    }

    // date_facility mode requires facilityName
    if (body.sessionContext?.scopeMode === 'date_facility' && !body.sessionContext?.facilityName) {
      return NextResponse.json(
        { error: 'facilityName is required when scopeMode is date_facility' },
        { status: 400 },
      );
    }

    // ═══════════════════════════════════════════════════════════
    // EMPTY-SCOPE ENFORCEMENT — reject accept actions when scope is empty
    // ═══════════════════════════════════════════════════════════
    const isEmptyScope = body.sessionContext?.isEmptyScope === true;

    if (isEmptyScope) {
      const invalidActions = body.decisions.filter(d => d.action === 'accept');
      if (invalidActions.length > 0) {
        return NextResponse.json(
          {
            error: `Empty-scope reconciliation only allows create/reject actions. ` +
            `Found ${invalidActions.length} accept action(s) which require existing candidates.`,
            invalidRows: invalidActions.map(d => d.sno),
          },
          { status: 400 },
        );
      }
    }

    // Structured scope audit log
    console.log(JSON.stringify({
      level: 'info',
      action: 'register_reconcile_start',
      scope: {
        screeningDate: resolvedDate,
        facilityName: body.sessionContext?.facilityName ?? null,
        screeningDistrict: body.sessionContext?.screeningDistrict ?? null,
        screeningState: body.sessionContext?.screeningState ?? null,
        scopeMode: body.sessionContext?.scopeMode ?? 'date_only',
        sessionId: body.sessionContext?.sessionId ?? null,
        isEmptyScope,
        scopedCandidateCount: body.sessionContext?.scopedCandidateCount ?? 0,
      },
      user: session.user.email || session.user.name,
      decisionCount: body.decisions.length,
      actionBreakdown: {
        accept: body.decisions.filter(d => d.action === 'accept').length,
        create: body.decisions.filter(d => d.action === 'create').length,
        reject: body.decisions.filter(d => d.action === 'reject').length,
      },
    }))

    const supabase = getSupabaseClient();
    const results = {
      accepted: 0,
      created: 0,
      rejected: 0,
      duplicatesSkipped: 0,
      errors: [] as { sno: number; error: string }[],
    };

    for (const decision of body.decisions) {
      try {
        if (decision.action === 'accept' && decision.patientId) {
          // ── Link to existing patient ──
          const updatePayload: Record<string, any> = {};

          if (decision.extractedData.name) {
            updatePayload.inmate_name = decision.extractedData.name;
          }
          if (decision.extractedData.father_name) {
            updatePayload.father_husband_name = decision.extractedData.father_name;
          }
          if (decision.extractedData.age != null) {
            updatePayload.age = Number(decision.extractedData.age);
          }
          if (decision.extractedData.address) {
            updatePayload.address = decision.extractedData.address;
          }
          if (decision.extractedData.mobile) {
            updatePayload.contact_number = decision.extractedData.mobile;
          }

          if (Object.keys(updatePayload).length > 0) {
            const { error } = await supabase
              .from('patients')
              .update(updatePayload)
              .eq('id', decision.patientId);

            if (error) {
              results.errors.push({
                sno: decision.sno,
                error: `Update failed: ${error.message}`,
              });
            } else {
              results.accepted++;
            }
          } else {
            results.accepted++;
          }
        } else if (decision.action === 'create') {
          // ── Insert new patient ──
          // CRITICAL: screening_date comes from reconciliation session,
          // NOT from new Date(). This is the core gap-fill correctness fix.

          // Final duplicate guard: check if exact name+age+mobile already
          // exists for this date before inserting
          if (decision.extractedData.name) {
            const { data: existing } = await supabase
              .from('patients')
              .select('id')
              .eq('screening_date', resolvedDate)
              .ilike('inmate_name', decision.extractedData.name.trim())
              .limit(1)
              .maybeSingle();

            if (existing) {
              console.log(
                `[RegisterReconcile] Skipping duplicate for row ${decision.sno}: ` +
                `"${decision.extractedData.name}" already exists on ${resolvedDate}`,
              );
              results.duplicatesSkipped++;
              continue;
            }
          }

          const newPatient: Record<string, any> = {
            // ── Core Identity Fields (from extraction) ──
            inmate_name: decision.extractedData.name || null,
            father_husband_name: decision.extractedData.father_name || null,
            age: decision.extractedData.age != null
              ? Number(decision.extractedData.age)
              : null,
            contact_number: decision.extractedData.mobile || null,
            address: decision.extractedData.address || null,

            // ── Facility Context ──
            facility_name: decision.extractedData.ward
              || body.sessionContext?.facilityName
              || null,

            // ═══════════════════════════════════════════════════════════
            // CRITICAL FIX: Use the selected date, never today's date
            // ═══════════════════════════════════════════════════════════
            screening_date: resolvedDate,
            submitted_on: new Date().toISOString(),

            // ── Audit Trail ──
            staff_name: session.user.name || session.user.email || 'System',

            // ── Ownership Context ──
            screening_state:
              body.sessionContext?.screeningState ||
              (session.user as any).state ||
              null,
            screening_district:
              body.sessionContext?.screeningDistrict ||
              (session.user as any).district ||
              null,

            // Phonetic columns are AUTO-POPULATED by trg_patient_metaphone trigger
          };

          // Remove undefined values
          Object.keys(newPatient).forEach(key => {
            if (newPatient[key] === undefined) {
              delete newPatient[key];
            }
          });

          const { data: insertedPatient, error } = await supabase
            .from('patients')
            .insert(newPatient)
            .select('id, inmate_name, name_romanized, name_metaphone_primary')
            .single();

          if (error) {
            console.error(
              `[RegisterReconcile] Insert failed for row ${decision.sno}:`,
              { error: error.message, code: error.code, payload: newPatient },
            );
            results.errors.push({
              sno: decision.sno,
              error: `Insert failed: ${error.message}${error.hint ? ` (Hint: ${error.hint})` : ''}`,
            });
          } else {
            results.created++;
            if (insertedPatient) {
              console.log(
                `[RegisterReconcile] ✅ Created patient ${insertedPatient.id} ` +
                `with screening_date=${resolvedDate}`,
              );
            }
          }
        } else if (decision.action === 'reject') {
          results.rejected++;
        }
      } catch (err) {
        results.errors.push({
          sno: decision.sno,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // ── Update extraction record ──
    const { error: updateError } = await supabase
      .from('register_extractions')
      .update({
        status: 'committed',
        review_decisions: body.decisions,
        committed_at: new Date().toISOString(),
      })
      .eq('id', body.extractionId);

    if (updateError) {
      console.error(
        '[RegisterReconcile] Failed to update extraction record:',
        updateError,
      );
    }

    // ── Google Sheets Sync (after DB success, outcome surfaced) ──
    let sheetsTriggered = false;
    let sheetsError: string | null = null;

    try {
      if (
        process.env.GOOGLE_APPSCRIPT_URL &&
        (results.created > 0 || results.accepted > 0)
      ) {
        const gasResponse = await fetch(process.env.GOOGLE_APPSCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'TRIGGER_SYNC' }),
        });

        if (gasResponse.ok) {
          sheetsTriggered = true;
          console.log(
            `[RegisterReconcile] ✅ Sheets sync triggered: ` +
            `${results.created} new, ${results.accepted} updated`,
          );
        } else {
          sheetsTriggered = true;
          sheetsError = `Sheets sync returned HTTP ${gasResponse.status}: ${gasResponse.statusText}`;
          console.error(`[RegisterReconcile] ⚠️ ${sheetsError}`);
        }
      }
    } catch (syncError) {
      sheetsTriggered = true;
      sheetsError = syncError instanceof Error
        ? syncError.message
        : 'Sheets sync failed unexpectedly';
      console.error('[RegisterReconcile] Sheets sync error:', syncError);
    }

    // ── Structured audit log for reconcile result ──
    console.log(JSON.stringify({
      level: 'info',
      action: 'register_reconcile_complete',
      scope: {
        screeningDate: resolvedDate,
        facilityName: body.sessionContext?.facilityName ?? null,
        screeningDistrict: body.sessionContext?.screeningDistrict ?? null,
        screeningState: body.sessionContext?.screeningState ?? null,
        scopeMode: body.sessionContext?.scopeMode ?? 'date_only',
        sessionId: body.sessionContext?.sessionId ?? null,
        isEmptyScope,
      },
      results: {
        accepted: results.accepted,
        created: results.created,
        rejected: results.rejected,
        duplicatesSkipped: results.duplicatesSkipped,
        errors: results.errors.length,
      },
      total: body.decisions.length,
      dbCommitted: true,
    }))

    // ── Response ──
    return NextResponse.json({
      success: results.errors.length === 0,
      ...results,
      total: body.decisions.length,

      // DB commit status
      dbCommitted: true,

      // Scope context echoed back for audit
      scopeContext: {
        screeningDate: resolvedDate,
        facilityName: body.sessionContext?.facilityName ?? null,
        screeningDistrict: body.sessionContext?.screeningDistrict ?? null,
        screeningState: body.sessionContext?.screeningState ?? null,
        scopeMode: body.sessionContext?.scopeMode ?? 'date_only',
        isEmptyScope,
      },

      // Google Sheets sync status (surfaced to client)
      sheetsTriggered,
      sheetsError,
    });
  } catch (error) {
    console.error('[RegisterReconcile] Error:', error);
    return NextResponse.json(
      {
        error: 'Reconciliation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
