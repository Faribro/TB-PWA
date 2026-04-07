/**
 * stores/useReconciliationStore.ts
 *
 * Zustand store for the Register Reconciliation workflow.
 * Supports both batch and real-time SSE streaming modes.
 *
 * Phases: Upload → Extracting → Streaming → Review → Submitting → Complete
 */

import { create } from "zustand";
import type { ExtractedRow } from "@/lib/ocr/geminiExtractor";
import type { MatchResult } from "@/lib/matching/patientMatcher";

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

export type WorkflowPhase =
  | "upload"
  | "extracting"
  | "streaming"
  | "review"
  | "submitting"
  | "complete";

export type RowAction = "accept" | "create" | "reject" | "pending";
export type MatchStatus = "auto_match" | "needs_review" | "new_record";

export interface ExtractedRowWithMatches extends ExtractedRow {
  matches: MatchResult[];
  matchStatus?: MatchStatus;
}

export interface RowDecision {
  action: RowAction;
  /** For "accept": which patient_id was selected */
  selectedPatientId?: string;
  /** Has notification been sent for this row? */
  notified?: boolean;
}

export interface ExtractionSummary {
  autoMatch: number;
  needsReview: number;
  newRecord: number;
}

export interface NotificationResult {
  sno: number;
  email?: { sent: boolean; error?: string };
  whatsapp?: { sent: boolean; error?: string };
}

export interface ReconciliationState {
  // ── Phase ──
  phase: WorkflowPhase;

  // ── Upload ──
  uploadedFile: File | null;
  imagePreviewUrl: string | null;

  // ── Extraction ──
  extractionId: string | null;
  rows: ExtractedRowWithMatches[];
  summary: ExtractionSummary | null;
  modelVersion: string | null;
  latencyMs: number | null;
  extractionError: string | null;

  // ── Streaming ──
  streamingProgress: number; // 0-100
  totalRows: number;

  // ── Review decisions ──
  decisions: Map<number, RowDecision>;

  // ── Submission ──
  submitResult: {
    accepted: number;
    created: number;
    rejected: number;
    errors: { sno: number; error: string }[];
  } | null;

  // ── Notifications ──
  notificationResults: NotificationResult[];

  // ── Actions ──
  setFile: (file: File) => void;
  clearFile: () => void;
  startStreamExtraction: () => Promise<void>;
  startExtraction: () => Promise<void>;
  addRealtimeRow: (row: ExtractedRowWithMatches) => void;
  setDecision: (sno: number, decision: RowDecision) => void;
  autoDecideAll: () => void;
  submitReview: () => Promise<void>;
  confirmAndNotify: (sno: number, recipientEmail?: string) => Promise<void>;
  addNotificationResult: (result: NotificationResult) => void;
  reset: () => void;

  // ── Computed ──
  pendingCount: () => number;
  isReadyToSubmit: () => boolean;
}

// ═══════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════

export const useReconciliationStore = create<ReconciliationState>(
  (set, get) => ({
    // Initial state
    phase: "upload",
    uploadedFile: null,
    imagePreviewUrl: null,
    extractionId: null,
    rows: [],
    summary: null,
    modelVersion: null,
    latencyMs: null,
    extractionError: null,
    streamingProgress: 0,
    totalRows: 0,
    decisions: new Map(),
    submitResult: null,
    notificationResults: [],

    // ── Set File ──
    setFile: (file: File) => {
      const url = URL.createObjectURL(file);
      set({
        uploadedFile: file,
        imagePreviewUrl: url,
        phase: "upload",
        extractionError: null,
      });
    },

    // ── Clear File ──
    clearFile: () => {
      const { imagePreviewUrl } = get();
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      set({
        uploadedFile: null,
        imagePreviewUrl: null,
        phase: "upload",
        rows: [],
        decisions: new Map(),
        extractionError: null,
        streamingProgress: 0,
        totalRows: 0,
      });
    },

    // ════════════════════════════════════════════════════
    // SSE Streaming Extraction (Primary Mode)
    // ════════════════════════════════════════════════════
    startStreamExtraction: async () => {
      const { uploadedFile } = get();
      if (!uploadedFile) return;

      set({
        phase: "extracting",
        extractionError: null,
        rows: [],
        decisions: new Map(),
        streamingProgress: 0,
        totalRows: 0,
        summary: null,
      });

      try {
        const formData = new FormData();
        formData.append("image", uploadedFile);

        const res = await fetch("/api/reconcile/stream", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errBody = await res
            .json()
            .catch(() => ({ error: "Stream failed" }));
          throw new Error(errBody.error || `HTTP ${res.status}`);
        }

        if (!res.body) throw new Error("No response body for streaming");

        set({ phase: "streaming" });

        // Parse SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events in the buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          let eventType = "";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              eventData = line.slice(6);

              if (eventType && eventData) {
                try {
                  const parsed = JSON.parse(eventData);
                  handleSSEEvent(eventType, parsed, set, get);
                } catch {
                  // Skip unparseable events
                }
                eventType = "";
                eventData = "";
              }
            }
          }
        }

        // If we received rows and phase is still streaming, move to review
        const { phase: currentPhase, rows: currentRows } = get();
        if (currentPhase === "streaming" && currentRows.length > 0) {
          set({ phase: "review" });
        }
      } catch (error) {
        set({
          phase: "upload",
          extractionError:
            error instanceof Error ? error.message : "Extraction failed",
        });
      }
    },

    // ════════════════════════════════════════════════════
    // Batch Extraction (Fallback Mode)
    // ════════════════════════════════════════════════════
    startExtraction: async () => {
      const { uploadedFile } = get();
      if (!uploadedFile) return;

      set({ phase: "extracting", extractionError: null });

      try {
        const formData = new FormData();
        formData.append("image", uploadedFile);

        const res = await fetch("/api/register-extract", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errBody = await res
            .json()
            .catch(() => ({ error: "Extraction failed" }));
          throw new Error(errBody.error || `HTTP ${res.status}`);
        }

        const result = await res.json();

        const decisions = new Map<number, RowDecision>();
        for (const row of result.rows) {
          const sno = row.sno;
          if (sno == null) continue;

          const topMatch = row.matches?.[0];
          if (topMatch?.confidenceTier === "auto_match") {
            decisions.set(sno, {
              action: "accept",
              selectedPatientId: topMatch.patientId,
            });
          } else {
            decisions.set(sno, { action: "pending" });
          }
        }

        set({
          phase: "review",
          extractionId: result.extractionId,
          rows: result.rows,
          summary: result.summary,
          modelVersion: result.model,
          latencyMs: result.latencyMs,
          decisions,
        });
      } catch (error) {
        set({
          phase: "upload",
          extractionError:
            error instanceof Error ? error.message : "Extraction failed",
        });
      }
    },

    // ── Add Real-Time Row (called from SSE handler) ──
    addRealtimeRow: (row: ExtractedRowWithMatches) => {
      const { rows, decisions } = get();
      const newRows = [...rows, row];
      const newDecisions = new Map(decisions);

      const sno = row.sno;
      if (sno != null) {
        const topMatch = row.matches?.[0];
        if (topMatch && (topMatch as any).confidenceTier === "auto_match") {
          newDecisions.set(sno, {
            action: "accept",
            selectedPatientId: topMatch.patientId,
          });
        } else {
          newDecisions.set(sno, { action: "pending" });
        }
      }

      set({ rows: newRows, decisions: newDecisions });
    },

    // ── Set Decision for a specific row ──
    setDecision: (sno: number, decision: RowDecision) => {
      const decisions = new Map(get().decisions);
      decisions.set(sno, decision);
      set({ decisions });
    },

    // ── Auto-decide all pending rows ──
    autoDecideAll: () => {
      const { rows, decisions: currentDecisions } = get();
      const newDecisions = new Map(currentDecisions);

      for (const row of rows) {
        if (row.sno == null) continue;
        const current = newDecisions.get(row.sno);
        if (current?.action !== "pending") continue;

        const topMatch = row.matches?.[0];
        if (topMatch && topMatch.compositeScore >= 0.55) {
          newDecisions.set(row.sno, {
            action: "accept",
            selectedPatientId: topMatch.patientId,
          });
        } else {
          newDecisions.set(row.sno, { action: "create" });
        }
      }

      set({ decisions: newDecisions });
    },

    // ── Submit Review ──
    submitReview: async () => {
      const { extractionId, rows, decisions } = get();
      if (!extractionId) return;

      set({ phase: "submitting" });

      try {
        const decisionPayload = rows
          .filter((r) => r.sno != null)
          .map((row) => {
            const dec = decisions.get(row.sno!);
            return {
              sno: row.sno!,
              action:
                dec?.action === "pending"
                  ? "reject"
                  : dec?.action || "reject",
              patientId: dec?.selectedPatientId,
              extractedData: {
                name: row.name,
                father_name: row.father_name,
                age: row.age,
                ward: row.ward,
                address: row.address,
                mobile: row.mobile,
              },
            };
          });

        const res = await fetch("/api/register-reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extractionId,
            decisions: decisionPayload,
          }),
        });

        if (!res.ok) {
          throw new Error(`Reconciliation failed: HTTP ${res.status}`);
        }

        const result = await res.json();

        set({
          phase: "complete",
          submitResult: {
            accepted: result.accepted || 0,
            created: result.created || 0,
            rejected: result.rejected || 0,
            errors: result.errors || [],
          },
        });
      } catch (error) {
        set({
          phase: "review",
          extractionError:
            error instanceof Error ? error.message : "Submission failed",
        });
      }
    },

    // ── Confirm & Notify (single-click sync + notification) ──
    confirmAndNotify: async (sno: number, recipientEmail?: string) => {
      const { rows, decisions, extractionId } = get();
      const row = rows.find((r) => r.sno === sno);
      const decision = decisions.get(sno);
      if (!row || !decision) return;

      try {
        // 1. Sync to database
        const syncRes = await fetch("/api/register-reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extractionId: extractionId || "single-sync",
            decisions: [
              {
                sno,
                action: decision.action,
                patientId: decision.selectedPatientId,
                extractedData: {
                  name: row.name,
                  father_name: row.father_name,
                  age: row.age,
                  ward: row.ward,
                  address: row.address,
                  mobile: row.mobile,
                },
              },
            ],
          }),
        });

        if (!syncRes.ok) {
          throw new Error("Sync failed");
        }

        // 2. Trigger notification if email provided
        if (recipientEmail) {
          const { sendEmailAlert } = await import(
            "@/lib/notifications/patientAlert"
          );
          await sendEmailAlert(recipientEmail, {
            patientName: row.name || "Unknown",
            fatherName: row.father_name,
            age: row.age,
            mobile: row.mobile,
            matchStatus: row.matchStatus || "new_record",
            matchedPatientName: row.matches?.[0]?.patientName,
            confidenceScore: row.matches?.[0]?.compositeScore,
            action:
              decision.action === "accept"
                ? "linked"
                : decision.action === "create"
                  ? "created"
                  : "flagged",
          });
        }

        // 3. Mark as notified
        const newDecisions = new Map(get().decisions);
        newDecisions.set(sno, { ...decision, notified: true });
        set({ decisions: newDecisions });
      } catch (error) {
        console.error("[ConfirmAndNotify] Error:", error);
      }
    },

    // ── Add Notification Result ──
    addNotificationResult: (result: NotificationResult) => {
      set({
        notificationResults: [...get().notificationResults, result],
      });
    },

    // ── Reset ──
    reset: () => {
      const { imagePreviewUrl } = get();
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      set({
        phase: "upload",
        uploadedFile: null,
        imagePreviewUrl: null,
        extractionId: null,
        rows: [],
        summary: null,
        modelVersion: null,
        latencyMs: null,
        extractionError: null,
        streamingProgress: 0,
        totalRows: 0,
        decisions: new Map(),
        submitResult: null,
        notificationResults: [],
      });
    },

    // ── Computed ──
    pendingCount: () => {
      const { decisions } = get();
      let count = 0;
      decisions.forEach((d) => {
        if (d.action === "pending") count++;
      });
      return count;
    },

    isReadyToSubmit: () => {
      const { decisions } = get();
      if (decisions.size === 0) return false;
      let allDecided = true;
      decisions.forEach((d) => {
        if (d.action === "pending") allDecided = false;
      });
      return allDecided;
    },
  })
);

// ═══════════════════════════════════════════════════════
// SSE Event Handler (outside store for clarity)
// ═══════════════════════════════════════════════════════

function handleSSEEvent(
  eventType: string,
  data: any,
  set: any,
  get: any
) {
  switch (eventType) {
    case "status":
      // Phase update (e.g., "extracting")
      break;

    case "extraction_complete":
      set({
        totalRows: data.totalRows,
        modelVersion: data.modelVersion,
        latencyMs: data.latencyMs,
      });
      break;

    case "row":
      // Add the row in real-time
      get().addRealtimeRow(data.row);
      set({
        streamingProgress: data.progress,
        extractionId: data.extractionId,
      });
      break;

    case "complete":
      set({
        phase: "review",
        summary: data.summary,
        extractionId: data.extractionId,
        modelVersion: data.modelVersion,
        latencyMs: data.latencyMs,
        streamingProgress: 100,
      });
      break;

    case "error":
      set({
        phase: "upload",
        extractionError: data.message || "Stream error",
      });
      break;
  }
}
