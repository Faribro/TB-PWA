/**
 * POST /api/register-reconcile
 *
 * Receives the M&E officer's review decisions for an extraction.
 * For each row, the officer chose: accept (link), create (new), or reject.
 *
 * - "accept" → update existing patient record with extracted data
 * - "create" → insert new patient from extracted data
 * - "reject" → skip row (audit log only)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseClient } from "@/lib/supabase-server";

interface RowDecision {
  /** Serial number from the extracted row */
  sno: number;
  /** The action taken by the officer */
  action: "accept" | "create" | "reject";
  /** For "accept": the patient_id to link to */
  patientId?: string;
  /** The extracted data for this row */
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
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ALLOWED_ROLES = ["PM", "admin", "SPM", "MandE"];
    const userRole = session.user.role ?? "";
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden — Only PM, admin, SPM, and M&E roles can reconcile" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as ReconcileRequest;

    if (!body.extractionId || !body.decisions?.length) {
      return NextResponse.json(
        { error: "Missing extractionId or decisions array" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const results = {
      accepted: 0,
      created: 0,
      rejected: 0,
      errors: [] as { sno: number; error: string }[],
    };

    for (const decision of body.decisions) {
      try {
        if (decision.action === "accept" && decision.patientId) {
          // ── Link to existing patient ──
          const updatePayload: Record<string, any> = {};

          if (decision.extractedData.name) {
            updatePayload.inmate_name = decision.extractedData.name;
          }
          if (decision.extractedData.father_name) {
            updatePayload.father_husband_name = decision.extractedData.father_name;
          }
          if (decision.extractedData.age != null) {
            updatePayload.age = Number(decision.extractedData.age);  // INTEGER type
          }
          if (decision.extractedData.address) {
            updatePayload.address = decision.extractedData.address;
          }
          if (decision.extractedData.mobile) {
            updatePayload.contact_number = decision.extractedData.mobile;
          }

          if (Object.keys(updatePayload).length > 0) {
            const { error } = await supabase
              .from("patients")
              .update(updatePayload)
              .eq("id", decision.patientId);

            if (error) {
              results.errors.push({
                sno: decision.sno,
                error: `Update failed: ${error.message}`,
              });
            } else {
              results.accepted++;
            }
          } else {
            results.accepted++; // No fields to update, but accept is valid
          }
        } else if (decision.action === "create") {
          // ── Insert new patient ──
          // CRITICAL: Only insert into actual schema columns
          // DO NOT manually populate name_romanized, name_metaphone_primary, or name_metaphone_alternate
          // The trg_patient_metaphone trigger handles these automatically
          
          // ═══════════════════════════════════════════════════════
          // SCHEMA-COMPLIANT INSERTION PAYLOAD
          // Based on: supabase/migrations/001_schema_hardening.sql
          // ═══════════════════════════════════════════════════════
          const newPatient: Record<string, any> = {
            // ── Core Identity Fields (from OCR) ──
            inmate_name: decision.extractedData.name || null,
            father_husband_name: decision.extractedData.father_name || null,
            
            // ⚠️ CRITICAL: age is INTEGER (not TEXT) per 001_schema_hardening.sql
            age: decision.extractedData.age != null
              ? Number(decision.extractedData.age)  // Cast to INTEGER
              : null,
            
            contact_number: decision.extractedData.mobile || null,
            address: decision.extractedData.address || null,
            
            // ── Facility Context ──
            facility_name: decision.extractedData.ward || null,
            
            // ── Audit Trail (required for tracking) ──
            staff_name: session.user.name || session.user.email || 'System',
            screening_date: new Date().toISOString().split("T")[0],  // DATE type
            submitted_on: new Date().toISOString(),  // TIMESTAMPTZ type
            
            // ── Ownership Context (for RLS policies) ──
            screening_state: session.user.state || null,
            screening_district: session.user.district || null,
            
            // ── Phonetic Columns (AUTO-POPULATED by trg_patient_metaphone) ──
            // DO NOT include: name_romanized, name_metaphone_primary, name_metaphone_alternate
            // The BEFORE INSERT trigger handles these automatically from inmate_name
          };

          // Remove null/undefined values to avoid schema violations
          Object.keys(newPatient).forEach(key => {
            if (newPatient[key] === undefined) {
              delete newPatient[key];
            }
          });

          const { data: insertedPatient, error } = await supabase
            .from("patients")
            .insert(newPatient)
            .select('id, inmate_name, name_romanized, name_metaphone_primary')
            .single();

          if (error) {
            // Enhanced error logging for schema mismatches
            console.error(
              `[RegisterReconcile] Insert failed for row ${decision.sno}:`,
              {
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                payload: newPatient,
              }
            );
            
            results.errors.push({
              sno: decision.sno,
              error: `Insert failed: ${error.message}${error.hint ? ` (Hint: ${error.hint})` : ''}`,
            });
          } else {
            results.created++;
            
            // Verify trigger populated phonetic columns
            if (insertedPatient) {
              console.log(
                `[RegisterReconcile] ✅ Created patient ${insertedPatient.id}:`,
                {
                  inmate_name: insertedPatient.inmate_name,
                  name_romanized: insertedPatient.name_romanized,
                  metaphone: insertedPatient.name_metaphone_primary,
                }
              );
            }
          }
        } else if (decision.action === "reject") {
          results.rejected++;
        }
      } catch (err) {
        results.errors.push({
          sno: decision.sno,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // ── Update extraction record with review decisions ──
    const { error: updateError } = await supabase
      .from("register_extractions")
      .update({
        status: "committed",
        review_decisions: body.decisions,
        committed_at: new Date().toISOString(),
      })
      .eq("id", body.extractionId);

    if (updateError) {
      console.error(
        "[RegisterReconcile] Failed to update extraction record:",
        updateError
      );
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      ...results,
      total: body.decisions.length,
    });
  } catch (error) {
    console.error("[RegisterReconcile] Error:", error);
    return NextResponse.json(
      {
        error: "Reconciliation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
