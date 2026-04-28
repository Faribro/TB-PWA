/**
 * POST /api/register-extract
 *
 * Receives a file upload + reconciliation session context.
 * Parses the file, runs scoped matching, returns classified rows.
 *
 * This is the ONLY extraction endpoint for the gap-fill workflow.
 * It performs all 3 stages: Parse → Match → Classify.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseClient } from '@/lib/supabase-server';
import { matchRowsScoped } from '@/lib/matching/patientMatcher';
import type {
  ReconciliationSessionContext,
  ScopedMatchOptions,
} from '@/lib/reconciliation/sessionTypes';
import {
  validateScopeContext,
  logReconciliationAudit,
} from '@/lib/reconciliation/scopeValidation';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

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
        { error: 'Forbidden — Only PM, admin, SPM, and M&E roles can extract registers' },
        { status: 403 },
      );
    }

    // ── Parse multipart form ──
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Send as form field "file".' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum 20 MB.' },
        { status: 400 },
      );
    }

    // ── Read session context from form fields ──
    const screeningDate = formData.get('screeningDate') as string | null;
    const facilityName = formData.get('facilityName') as string | null;
    const screeningDistrict = formData.get('screeningDistrict') as string | null;
    const screeningState = formData.get('screeningState') as string | null;
    const scopeMode = (formData.get('scopeMode') as string) || 'date_only';
    const sessionId = (formData.get('sessionId') as string) || crypto.randomUUID();
    const useAI = formData.get('useAI') === 'true';
    const useAINormalization = formData.get('useAINormalization') === 'true';

    // ═══════════════════════════════════════════════════════════
    // SCOPE VALIDATION — reject incomplete scope inputs
    // ═══════════════════════════════════════════════════════════
    const scopeContext = {
      screeningDate,
      facilityName,
      screeningDistrict,
      screeningState,
      scopeMode,
      sessionId,
    };

    const validationErrors = validateScopeContext(scopeContext);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors[0].message },
        { status: 400 },
      );
    }

    // Structured scope audit log
    logReconciliationAudit('register_extract_start', {
      user: session.user.email || session.user.name,
      sessionId,
      screeningDate,
      facilityName: facilityName ?? null,
      screeningDistrict: screeningDistrict ?? null,
      screeningState: screeningState ?? null,
      scopeMode,
      rowCount: 0, // Will be updated after extraction
    });

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Detect file type
    const declaredMime = file.type || '';
    const filename = file.name.toLowerCase();
    const isExcel = declaredMime.includes('spreadsheetml') || filename.endsWith('.xlsx');
    const isCSV = declaredMime === 'text/csv' || filename.endsWith('.csv');

    let extractionResult: any;

    if (isExcel || isCSV) {
      const { extractFromSpreadsheet } = await import('@/lib/ocr/excelExtractor');
      extractionResult = await extractFromSpreadsheet(buffer, filename);
    } else {
      const { extractRegisterImageHybrid } = await import('@/lib/ocr/hybridExtractor');
      const mime = declaredMime.startsWith('image/') ? declaredMime : 'application/pdf';
      extractionResult = await extractRegisterImageHybrid(buffer, mime);
    }

    // ── Stage 2.5: AI Normalization (optional) ──
    if (useAINormalization && extractionResult.rows?.length > 0) {
      try {
        const { callOpenRouterNormalize } = await import('@/lib/ai/openRouterMatcher');
        
        // Batch normalize names (limit to 50 at a time to avoid rate limits)
        const batchSize = 50;
        const normalizedRows = [...extractionResult.rows];
        
        for (let i = 0; i < normalizedRows.length; i += batchSize) {
          const batch = normalizedRows.slice(i, i + batchSize);
          const normalizePromises = batch.map(row => 
            callOpenRouterNormalize({ name: row.name, fatherName: row.father_name })
              .then(result => ({
                ...row,
                name: result.normalizedName,
                father_name: result.normalizedFatherName || row.father_name,
                aiNormalized: true,
              }))
              .catch(err => {
                console.error(`[AI Normalize] Failed for row ${row.sno}:`, err);
                return row; // Fall back to original
              })
          );
          
          const batchResults = await Promise.all(normalizePromises);
          batchResults.forEach((normalizedRow, idx) => {
            normalizedRows[i + idx] = normalizedRow;
          });
        }
        
        extractionResult.rows = normalizedRows;
        console.log(`[register-extract] AI normalized ${normalizedRows.length} rows`);
      } catch (error) {
        console.error('[register-extract] AI normalization failed:', error);
        // Continue with original names
      }
    }

    // ── Stage 3: Scoped Matching ──
    const supabase = getSupabaseClient();

    // ═══════════════════════════════════════════════════════════
    // VALIDATE REGISTER CONTEXT AGAINST SESSION CONTEXT
    // ═══════════════════════════════════════════════════════════
    if (extractionResult.rows.length > 0) {
      const {
        extractRegisterContext,
        validateRegisterContext,
        buildValidationErrorResponse,
      } = await import('@/lib/reconciliation/registerContextValidator');

      // Extract register context (majority-vote from all rows)
      const { context: registerContext, mixedContextRows } = extractRegisterContext(
        extractionResult.rows
      );

      // Validate against session context
      const validation = validateRegisterContext(registerContext, {
        screeningState,
        screeningDistrict,
        facilityName,
        screeningDate,
      });

      // Log warnings (non-blocking)
      if (validation.warnings.length > 0) {
        console.warn('[RegisterExtract] Context validation warnings:', validation.warnings);
      }

      // Log mixed-context rows (non-blocking but suspicious)
      if (mixedContextRows.length > 0) {
        console.warn(
          `[RegisterExtract] Mixed-context detected: ${mixedContextRows.length} row(s) disagree with majority`,
          mixedContextRows
        );
      }

      // Reject if mismatches found
      if (!validation.isValid) {
        const errorResponse = buildValidationErrorResponse(validation, mixedContextRows);
        console.error('[RegisterExtract] Context validation failed:', errorResponse);
        return NextResponse.json(errorResponse, { status: 400 });
      }

      console.log('[RegisterExtract] Context validation passed:', registerContext);
    }

    const scopeOptions: ScopedMatchOptions = {
      screeningDate,
      facilityName,
      screeningDistrict,
      screeningState,
      scopeMode: scopeMode as 'date_only' | 'date_facility',
      useAI,
    };

    const { results: matchResults, summary } = await matchRowsScoped(
      supabase,
      extractionResult.rows,
      scopeOptions,
      useAI,
    );

    // ── Persist extraction to audit log ──
    const sessionContext: Partial<ReconciliationSessionContext> = {
      sessionId,
      selectedDate: screeningDate,
      facilityName,
      screeningDistrict,
      screeningState,
      scopeMode: scopeMode as any,
      sourceFileName: file.name,
      sourceType: 'spreadsheet',
      uploadedBy: session.user.email || session.user.name || 'Unknown',
      uploadedAt: new Date().toISOString(),
    };

    const { data: insertedExtraction, error: insertError } = await supabase
      .from('register_extractions')
      .insert({
        created_by: session.user.email || session.user.name,
        image_mime: file.type,
        status: 'pending',
        extracted_rows: matchResults,
        match_results: [],
        metadata: {
          engine: extractionResult.engine,
          totalRows: extractionResult.summary.totalRowsParsed,
          validRows: extractionResult.summary.validRows,
          invalidRows: extractionResult.summary.invalidRows,
          duplicatesInFile: extractionResult.summary.duplicatesInFile,
          fileName: file.name,
          fileSize: file.size,
          sourceType: 'spreadsheet',
          latencyMs: extractionResult.latencyMs,
          sessionContext,
          warnings: extractionResult.warnings,
        },
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[RegisterExtract] Failed to persist extraction:', insertError);
    }

    // ── Structured audit log for extraction result ──
    logReconciliationAudit('register_extract_complete', {
      action: 'register_extract_complete',
      user: session.user.email || session.user.name,
      sessionId,
      screeningDate,
      facilityName: facilityName ?? null,
      screeningDistrict: screeningDistrict ?? null,
      screeningState: screeningState ?? null,
      scopeMode,
      isEmptyScope: summary.isEmptyScope,
      scopedCandidateCount: summary.scopedCandidateCount,
      summary: {
        autoMatch: summary.autoMatch,
        needsReview: summary.needsReview,
        newRecord: summary.newRecord,
        duplicateInFile: summary.duplicateInFile,
        duplicateInScope: summary.duplicateInScope,
      },
      rowCount: matchResults.length,
      extractionId: insertedExtraction?.id ?? null,
    });

    // ── Build response ──
    return NextResponse.json({
      extractionId: insertedExtraction?.id || null,
      sessionId,

      // Session context echoed back for store hydration
      sessionContext: {
        screeningDate,
        facilityName: facilityName ?? null,
        screeningDistrict: screeningDistrict ?? null,
        screeningState: screeningState ?? null,
        scopeMode,
      },

      // Match results
      results: matchResults,
      summary,

      // Parse stats
      parseStats: extractionResult.summary,
      warnings: extractionResult.warnings,

      // Metadata
      source: 'spreadsheet',
      latencyMs: extractionResult.latencyMs,
      rowCount: matchResults.length,
    });
  } catch (error: any) {
    console.error('[RegisterExtract] Error:', error);
    return NextResponse.json(
      {
        error: 'Extraction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
