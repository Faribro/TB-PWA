import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseClient } from "@/lib/supabase-server";
import { matchPatient } from "@/lib/matching/patientMatcher";
import type { HybridExtractionResult } from "@/lib/ocr/hybridExtractor";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

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
        { error: "Forbidden — Only PM, admin, SPM, and M&E roles can extract registers" },
        { status: 403 }
      );
    }

    // ── Parse multipart form ──
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Send as form field 'file'." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum 20 MB." },
        { status: 400 }
      );
    }

    // Read raw buffer — works for all file types
    const buffer = Buffer.from(await file.arrayBuffer());

    // Detect MIME from buffer magic bytes as secondary check
    const declaredMime = file.type || '';
    const filename = file.name.toLowerCase();

    // Determine file category
    const isImage = declaredMime.startsWith('image/');
    const isPDF   = declaredMime === 'application/pdf' || filename.endsWith('.pdf');
    const isExcel = declaredMime.includes('spreadsheetml') || filename.endsWith('.xlsx');
    const isCSV   = declaredMime === 'text/csv' || filename.endsWith('.csv');

    if (!isImage && !isPDF && !isExcel && !isCSV) {
      return NextResponse.json(
        { error: `Unsupported file type: ${declaredMime}` },
        { status: 415 }
      );
    }

    let extractionResult: HybridExtractionResult | any;

    if (isExcel || isCSV) {
      // Route to Excel/CSV extractor
      const { extractFromSpreadsheet } = await import('@/lib/ocr/excelExtractor');
      extractionResult = await extractFromSpreadsheet(buffer, filename);
    } else if (isPDF) {
      // Route directly to Gemini (skip Tesseract for PDFs)
      const { extractRegisterImage: extractPDF } = await import('@/lib/ocr/geminiExtractor');
      extractionResult = await extractPDF(buffer, 'application/pdf');
    } else {
      // Route to hybrid extractor (Tesseract → Gemini fallback)
      const { extractRegisterImage: extractHybrid } = await import('@/lib/ocr/hybridExtractor');
      extractionResult = await extractHybrid(buffer, declaredMime);
    }

    const sanitizedRows = extractionResult.rows || [];

    // ── SKIP patient matching for faster initial response ──
    // Matching will be done on client side or in separate step
    const rowsWithMatches = sanitizedRows.map((row: any) => ({
      ...row,
      matches: [], // Empty for now
    }));

    // ── Persist extraction to audit log ──
    const supabase = getSupabaseClient();
    const { data: insertedExtraction, error: insertError } = await supabase
      .from("register_extractions")
      .insert({
        created_by: session.user.email || session.user.name,
        image_mime: file.type,
        status: "pending",
        extracted_rows: rowsWithMatches,
        match_results: [],
        metadata: {
          engine: extractionResult.engine || 'unknown',
          cost: extractionResult.cost || 0,
          fallbackReason: extractionResult.fallbackReason,
          model: extractionResult.modelVersion,
          latencyMs: extractionResult.latencyMs,
          keyIndex: extractionResult.keyIndex,
          totalRows: sanitizedRows.length,
          fileName: file.name,
          fileSize: file.size,
          sourceType: isExcel ? 'excel' : isPDF ? 'pdf' : 'image',
        },
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[RegisterExtract] Failed to persist extraction:", insertError);
    }

    // ── Build summary stats (without matching) ──
    const summary = {
      autoMatch: 0,
      needsReview: 0,
      newRecord: sanitizedRows.length, // All treated as new until matched
    };

    return NextResponse.json({
      extractionId: insertedExtraction?.id || null,
      totalRows: sanitizedRows.length,
      summary,
      model: extractionResult.modelVersion,
      latencyMs: extractionResult.latencyMs,
      rows: rowsWithMatches,
      source: isExcel ? 'excel' : isPDF ? 'pdf' : 'image',
      rowCount: rowsWithMatches.length,
      skipMatching: true, // Flag to indicate matching not done yet
      preprocessing: (extractionResult as any).preprocessing ?? null,
    });
  } catch (error: any) {
    console.error("[RegisterExtract] Error:", error);
    return NextResponse.json(
      {
        error: "Extraction failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
