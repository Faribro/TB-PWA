/**
 * POST /api/register-extract
 *
 * Accepts a multipart form upload (register image), runs VLM extraction
 * via Gemini, then fuzzy-matches each extracted row against the patients
 * table. Returns the extraction + match results for human review.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseClient } from "@/lib/supabase-server";
import {
  extractRegisterImage,
  sanitizeExtractedRows,
} from "@/lib/ocr/hybridExtractor"; // Changed from geminiExtractor to hybridExtractor
import { matchPatient } from "@/lib/matching/patientMatcher";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
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
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided. Send as form field 'image'." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Use JPEG, PNG, or WebP.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum 20 MB." },
        { status: 400 }
      );
    }

    // ── Extract via Hybrid OCR (Tesseract → Gemini fallback) ──
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const extraction = await extractRegisterImage(imageBuffer, file.type);
    const sanitizedRows = extraction.rows; // Already sanitized by hybrid extractor

    // ── Match each row against patients DB ──
    const supabase = getSupabaseClient();
    const rowsWithMatches = await Promise.all(
      sanitizedRows.map(async (row) => {
        if (!row.name) {
          return { ...row, matches: [] };
        }

        const matches = await matchPatient(supabase, {
          name: row.name,
          age: row.age,
          mobile: row.mobile,
          ocrConfidence: row.confidence_score,
        });

        return { ...row, matches };
      })
    );

    // ── Persist extraction to audit log ──
    const { data: insertedExtraction, error: insertError } = await supabase
      .from("register_extractions")
      .insert({
        created_by: session.user.email || session.user.name,
        image_mime: file.type,
        status: "pending",
        extracted_rows: rowsWithMatches,
        match_results: rowsWithMatches.map((r) => ({
          sno: r.sno,
          name: r.name,
          matchCount: r.matches.length,
          topTier: r.matches[0]?.confidenceTier || "new_record",
          topScore: r.matches[0]?.compositeScore || 0,
        })),
        metadata: {
          engine: extraction.engine, // 'tesseract' or 'gemini'
          cost: extraction.cost, // 0 for tesseract, 1 for gemini
          fallbackReason: extraction.fallbackReason, // Only present if gemini was used
          model: extraction.modelVersion,
          latencyMs: extraction.latencyMs,
          keyIndex: extraction.keyIndex,
          totalRows: sanitizedRows.length,
          fileName: file.name,
          fileSize: file.size,
        },
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[RegisterExtract] Failed to persist extraction:", insertError);
    }

    // ── Build summary stats ──
    const autoMatchCount = rowsWithMatches.filter(
      (r) => r.matches[0]?.confidenceTier === "auto_match"
    ).length;
    const needsReviewCount = rowsWithMatches.filter(
      (r) => r.matches[0]?.confidenceTier === "needs_review"
    ).length;
    const newRecordCount = rowsWithMatches.filter(
      (r) => !r.matches.length || r.matches[0]?.confidenceTier === "new_record"
    ).length;

    return NextResponse.json({
      extractionId: insertedExtraction?.id || null,
      totalRows: sanitizedRows.length,
      summary: {
        autoMatch: autoMatchCount,
        needsReview: needsReviewCount,
        newRecord: newRecordCount,
      },
      model: extraction.modelVersion,
      latencyMs: extraction.latencyMs,
      rows: rowsWithMatches,
    });
  } catch (error) {
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
