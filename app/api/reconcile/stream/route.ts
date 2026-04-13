/**
 * POST /api/reconcile/stream
 *
 * SSE streaming endpoint for register image extraction + matching.
 * Accepts a multipart form upload (register image), runs VLM extraction
 * via Gemini, then matches each row one-by-one against the patients table
 * and streams results back as Server-Sent Events.
 *
 * Each SSE event contains: rowId, extractedData, matchStatus, confidenceScore
 */

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getSupabaseClient } from "@/lib/supabase-server";
import {
  extractRegisterImage,
  sanitizeExtractedRows,
} from "@/lib/ocr/geminiExtractor";
import { matchPatients, type BulkMatchParams } from "@/lib/matching/patientMatcher";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // ── Auth ──
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ALLOWED_ROLES = ["PM", "admin", "SPM", "MandE"];
  const userRole = (session.user as any).role ?? "";
  if (!ALLOWED_ROLES.includes(userRole)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Parse multipart form ──
  let imageBuffer: Buffer;
  let mimeType: string;
  let fileName: string;

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No image file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED_MIME.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: `Unsupported file type: ${file.type}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum 20 MB." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
    mimeType = file.type;
    fileName = file.name;
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to parse form data" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Create SSE stream ──
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // Phase 1: Extraction
        send("status", {
          phase: "extracting",
          message: "Running Gemini VLM extraction...",
        });

        const extraction = await extractRegisterImage(imageBuffer, mimeType);
        const sanitizedRows = sanitizeExtractedRows(extraction.rows);
        const totalRows = sanitizedRows.length;

        send("extraction_complete", {
          totalRows,
          modelVersion: extraction.modelVersion,
          latencyMs: extraction.latencyMs,
        });

        // Phase 2: Bulk in-memory matching
        const supabase = getSupabaseClient();
        let autoMatchCount = 0;
        let needsReviewCount = 0;
        let newRecordCount = 0;

        // Persist extraction to audit log
        const { data: insertedExtraction } = await supabase
          .from("register_extractions")
          .insert({
            created_by: session.user?.email || session.user?.name,
            image_mime: mimeType,
            status: "pending",
            extracted_rows: sanitizedRows,
            metadata: {
              model: extraction.modelVersion,
              latencyMs: extraction.latencyMs,
              keyIndex: extraction.keyIndex,
              totalRows,
              fileName,
              streaming: true,
            },
          })
          .select("id")
          .single();

        const extractionId = insertedExtraction?.id || null;

        // Convert to BulkMatchParams format
        const bulkParams: BulkMatchParams[] = sanitizedRows.map(row => ({
          name: row.name || '',
          age: row.age,
          mobile: row.mobile,
          ocrConfidence: row.confidence_score,
          sno: row.sno,
        }));

        // Run bulk in-memory matching
        const matchResults = await matchPatients(supabase, bulkParams);

        // Stream each row with its matches
        for (let i = 0; i < matchResults.length; i++) {
          const result = matchResults[i];
          const row = sanitizedRows[i];

          if (result.matchStatus === "auto_match") {
            autoMatchCount++;
          } else if (result.matchStatus === "needs_review") {
            needsReviewCount++;
          } else {
            newRecordCount++;
          }

          send("row", {
            index: i,
            totalRows,
            progress: Math.round(((i + 1) / totalRows) * 100),
            extractionId,
            row: {
              ...row,
              matches: result.matches,
              matchStatus: result.matchStatus,
            },
          });
        }

        // Phase 3: Complete
        send("complete", {
          extractionId,
          totalRows,
          summary: {
            autoMatch: autoMatchCount,
            needsReview: needsReviewCount,
            newRecord: newRecordCount,
          },
          modelVersion: extraction.modelVersion,
          latencyMs: extraction.latencyMs,
        });
      } catch (error: any) {
        send("error", {
          message: error?.message || "Stream processing failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
