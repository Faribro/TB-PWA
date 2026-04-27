/**
 * stores/useReconciliationStore.ts
 *
 * Zustand store for the Register Reconciliation workflow.
 * Supports both batch and real-time SSE streaming modes.
 *
 * Extended for date-scoped gap-fill reconciliation:
 * - Session context flows from Vertex → Store → API → Commit
 * - screeningDate is mandatory for the gap-fill path
 * - Submit payload includes session context so the API uses selectedDate
 *
 * Phases: Upload → Extracting → Streaming → Review → Submitting → Complete
 */

import { create } from 'zustand';
import {
  validateScopeContext,
  assertEmptyScopeActions,
  logReconciliationAudit,
} from '@/lib/reconciliation/scopeValidation';
import type { ExtractedRow } from "@/lib/ocr/geminiExtractor";
import type { MatchResult } from "@/lib/matching/patientMatcher";
import type {
  ReconciliationSessionContext,
  RowMatchResult,
  ReconciliationSummary,
  ReconcileCommitResponse,
  ScopeMode,
  SourceType,
} from "@/lib/reconciliation/sessionTypes";

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

export type ExtractionSource = "image" | "pdf" | "excel" | "spreadsheet";

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

  // ═══════════════════════════════════════════════════════
  // Session Context (NEW — date-scoped reconciliation)
  // ═══════════════════════════════════════════════════════
  sessionId: string | null;
  selectedDate: string | null;          // YYYY-MM-DD — the gap date
  facilityName: string | null;
  screeningDistrict: string | null;
  screeningState: string | null;
  scopeMode: ScopeMode;
  sourceFileName: string | null;
  sourceFileHash: string | null;

  // ── Extraction ──
  extractionId: string | null;
  rows: ExtractedRowWithMatches[];
  matchResults: RowMatchResult[];       // Scoped match results
  summary: ExtractionSummary | null;
  scopedSummary: ReconciliationSummary | null;
  scopeContext: {
    screeningDate: string | null;
    facilityName: string | null;
    screeningDistrict: string | null;
    screeningState: string | null;
    scopeMode: string | null;
    sessionId: string | null;
  } | null;
  source: ExtractionSource | null;
  modelVersion: string | null;
  latencyMs: number | null;
  extractionError: string | null;
  parseWarnings: string[];

  // ── Streaming ──
  streamingProgress: number; // 0-100
  totalRows: number;

  // ── Review decisions ──
  decisions: Map<number, RowDecision>;

  // ── Submission ──
  submitResult: ReconcileCommitResponse | null;

  // ── Notifications ──
  notificationResults: NotificationResult[];
  isReviewOpen: boolean;

  // ── Actions ──
  setFile: (file: File) => void;
  clearFile: () => void;

  /** Initialize a reconciliation session from Vertex context */
  startSession: (context: {
    selectedDate: string;
    facilityName?: string | null;
    screeningDistrict?: string | null;
    screeningState?: string | null;
    scopeMode?: ScopeMode;
  }) => void;

  /** Set parsed + matched rows from extract API */
  setParsedRows: (data: {
    extractionId: string;
    matchResults: RowMatchResult[];
    summary: ReconciliationSummary;
    parseWarnings?: string[];
    source?: ExtractionSource;
    latencyMs?: number;
  }) => void;

  startStreamExtraction: () => Promise<void>;
  startExtraction: () => Promise<void>;
  addRealtimeRow: (row: ExtractedRowWithMatches) => void;
  setDecision: (sno: number, decision: RowDecision) => void;
  autoDecideAll: () => void;
  submitReview: () => Promise<void>;
  confirmAndNotify: (sno: number, recipientEmail?: string) => Promise<void>;
  addNotificationResult: (result: NotificationResult) => void;
  reset: () => void;

  // ── Handoff Setters (legacy compat) ──
  setExtractionData: (data: {
    extractionId: string;
    rows: ExtractedRowWithMatches[];
    summary: ExtractionSummary;
    source: ExtractionSource;
    modelVersion?: string;
    latencyMs?: number;
  }) => void;
  setIsReviewOpen: (open: boolean) => void;
  setPhase: (phase: WorkflowPhase) => void;

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

    // Session context
    sessionId: null,
    selectedDate: null,
    facilityName: null,
    screeningDistrict: null,
    screeningState: null,
    scopeMode: "date_only",
    sourceFileName: null,
    sourceFileHash: null,

    extractionId: null,
    rows: [],
    matchResults: [],
    summary: null,
    scopedSummary: null,
    modelVersion: null,
    latencyMs: null,
    extractionError: null,
    parseWarnings: [],
    streamingProgress: 0,
    totalRows: 0,
    decisions: new Map(),
    submitResult: null,
    notificationResults: [],
    source: null,
    isReviewOpen: false,

    // ── Set File ──
    setFile: (file: File) => {
      const url = URL.createObjectURL(file);
      set({
        uploadedFile: file,
        imagePreviewUrl: url,
        sourceFileName: file.name,
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
        sourceFileName: null,
        phase: "upload",
        rows: [],
        matchResults: [],
        decisions: new Map(),
        extractionError: null,
        parseWarnings: [],
        streamingProgress: 0,
        totalRows: 0,
      });
    },

    // ══════════════════════════════════════════════════════
    // NEW: Start a Reconciliation Session
    // ══════════════════════════════════════════════════════
    startSession: (context) => {
      const sessionId = crypto.randomUUID();
      set({
        sessionId,
        selectedDate: context.selectedDate,
        facilityName: context.facilityName ?? null,
        screeningDistrict: context.screeningDistrict ?? null,
        screeningState: context.screeningState ?? null,
        scopeMode: context.scopeMode ?? (context.facilityName ? "date_facility" : "date_only"),
        // Reset workflow state for new session
        phase: "upload",
        uploadedFile: null,
        imagePreviewUrl: null,
        extractionId: null,
        rows: [],
        matchResults: [],
        summary: null,
        scopedSummary: null,
        decisions: new Map(),
        submitResult: null,
        extractionError: null,
        parseWarnings: [],
        source: null,
        isReviewOpen: false,
      });
    },

    // ══════════════════════════════════════════════════════
    // NEW: Set Parsed + Matched Rows (from extract API)
    // ══════════════════════════════════════════════════════
    setParsedRows: (data) => {
      const decisions = new Map<number, RowDecision>();

      for (const result of data.matchResults) {
        const sno = result.sno;
        if (result.classification === "auto_match" && result.candidates[0]) {
          decisions.set(sno, {
            action: "accept",
            selectedPatientId: result.candidates[0].patientId,
          });
        } else if (result.classification === "new_record") {
          decisions.set(sno, { action: "create" });
        } else if (result.classification === "duplicate_in_file") {
          decisions.set(sno, { action: "reject" });
        } else {
          decisions.set(sno, { action: "pending" });
        }
      }

      set({
        extractionId: data.extractionId,
        matchResults: data.matchResults,
        scopedSummary: data.summary,
        scopeContext: data.sessionContext ?? null,
        summary: {
          autoMatch: data.summary.autoMatch,
          needsReview: data.summary.needsReview,
          newRecord: data.summary.newRecord,
        },
        parseWarnings: data.parseWarnings ?? [],
        source: data.source ?? "spreadsheet",
        latencyMs: data.latencyMs ?? null,
        decisions,
        phase: "review",
        isReviewOpen: true,
      });
    },

    // ════════════════════════════════════════════════════
    // SSE Streaming Extraction (Primary Mode for OCR)
    // ════════════════════════════════════════════════════
    startStreamExtraction: async () => {
      const { uploadedFile, selectedDate, facilityName, screeningDistrict, screeningState, scopeMode } = get();
      if (!uploadedFile) return;

      set({
        phase: "extracting",
        extractionError: null,
        rows: [],
        matchResults: [],
        decisions: new Map(),
        streamingProgress: 0,
        totalRows: 0,
        summary: null,
        scopedSummary: null,
      });

      try {
        const formData = new FormData();
        formData.append("image", uploadedFile);

        // Pass session context for scoped matching
        if (selectedDate) formData.append("screeningDate", selectedDate);
        if (facilityName) formData.append("facilityName", facilityName);
        if (screeningDistrict) formData.append("screeningDistrict", screeningDistrict);
        if (screeningState) formData.append("screeningState", screeningState);
        formData.append("scopeMode", scopeMode);

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

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

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
    // Batch Extraction (Gap-Fill Primary Mode)
    // ════════════════════════════════════════════════════
    startExtraction: async () => {
      const {
        uploadedFile,
        selectedDate,
        facilityName,
        screeningDistrict,
        screeningState,
        scopeMode,
        sessionId,
      } = get();
      if (!uploadedFile) return;

      set({ phase: "extracting", extractionError: null });

      try {
        const formData = new FormData();
        formData.append("file", uploadedFile);

        // ── Session context for scoped matching ──
        if (selectedDate) formData.append("screeningDate", selectedDate);
        if (facilityName) formData.append("facilityName", facilityName);
        if (screeningDistrict) formData.append("screeningDistrict", screeningDistrict);
        if (screeningState) formData.append("screeningState", screeningState);
        formData.append("scopeMode", scopeMode);
        if (sessionId) formData.append("sessionId", sessionId);

        const res = await fetch("/api/register-extract", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errBody = await res
            .json()
            .catch(() => ({ error: "Extraction failed" }));
          throw new Error(errBody.error || errBody.message || `HTTP ${res.status}`);
        }

        const result = await res.json();

        // Check if we got the new scoped format
        if (result.results && Array.isArray(result.results)) {
          // New scoped format: results are RowMatchResult[]
          get().setParsedRows({
            extractionId: result.extractionId,
            matchResults: result.results,
            summary: result.summary,
            parseWarnings: result.warnings,
            source: result.source ?? "spreadsheet",
            latencyMs: result.latencyMs,
          });
        } else if (result.rows && Array.isArray(result.rows)) {
          // Legacy format: rows are ExtractedRowWithMatches[]
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
            isReviewOpen: true,
          });
        }
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
      const { matchResults, rows, decisions: currentDecisions } = get();
      const newDecisions = new Map(currentDecisions);

      // Prefer matchResults (new scoped format)
      if (matchResults.length > 0) {
        for (const result of matchResults) {
          const current = newDecisions.get(result.sno);
          if (current?.action !== "pending") continue;

          if (result.classification === "duplicate_in_file") {
            newDecisions.set(result.sno, { action: "reject" });
          } else if (result.candidates.length > 0 && result.candidates[0].compositeScore >= 0.55) {
            newDecisions.set(result.sno, {
              action: "accept",
              selectedPatientId: result.candidates[0].patientId,
            });
          } else {
            newDecisions.set(result.sno, { action: "create" });
          }
        }
      } else {
        // Legacy format
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
      }

      set({ decisions: newDecisions });
    },

    // ══════════════════════════════════════════════════════
    // Submit Review — NOW INCLUDES SESSION CONTEXT
    // ══════════════════════════════════════════════════════
    submitReview: async () => {
      const {
        extractionId,
        rows,
        matchResults,
        decisions,
        selectedDate,
        facilityName,
        screeningDistrict,
        screeningState,
        scopeMode,
        sessionId,
        scopeContext,
        scopedSummary,
      } = get();

      if (!extractionId) return;

      // ═══════════════════════════════════════════════════════════
      // SUBMISSION GUARD — validate scope context
      // ═══════════════════════════════════════════════════════════
      const resolvedDate = scopeContext?.screeningDate ?? selectedDate;
      
      const validationErrors = validateScopeContext({
        screeningDate: resolvedDate,
        facilityName: scopeContext?.facilityName ?? facilityName,
        screeningDistrict: scopeContext?.screeningDistrict ?? screeningDistrict,
        screeningState: scopeContext?.screeningState ?? screeningState,
        scopeMode: scopeContext?.scopeMode ?? scopeMode ?? 'date_only',
      });

      if (validationErrors.length > 0) {
        console.error('[ReconciliationStore] Cannot submit:', validationErrors[0].message);
        set({ phase: 'review' });
        return;
      }

      // Empty-scope guard: reject if any accept action when isEmptyScope
      const isEmptyScope = scopedSummary?.isEmptyScope === true;
      const emptyScopeError = assertEmptyScopeActions(decisions, isEmptyScope);
      if (emptyScopeError) {
        console.error('[ReconciliationStore] Cannot submit:', emptyScopeError);
        set({ phase: 'review' });
        return;
      }

      // ═══════════════════════════════════════════════════════════
      // PRE-COMMIT VALIDATION WARNINGS
      // ═══════════════════════════════════════════════════════════
      const warnings: string[] = [];

      // Warn if accepting low-confidence matches (< 60%)
      if (matchResults.length > 0) {
        const lowConfidenceAccepts = matchResults.filter(r => {
          const dec = decisions.get(r.sno);
          if (dec?.action !== 'accept') return false;
          const topCandidate = r.candidates[0];
          return topCandidate && topCandidate.compositeScore < 0.60;
        });

        if (lowConfidenceAccepts.length > 0) {
          warnings.push(
            `${lowConfidenceAccepts.length} low-confidence match(es) being accepted (< 60% confidence). Review these carefully.`
          );
        }
      }

      // Warn if many new records in non-empty scope
      if (!isEmptyScope && scopedSummary?.newRecord > 0) {
        const newRecordRatio = scopedSummary.newRecord / (scopedSummary.autoMatch + scopedSummary.needsReview + scopedSummary.newRecord);
        if (newRecordRatio > 0.5) {
          warnings.push(
            `${scopedSummary.newRecord} new records (${(newRecordRatio * 100).toFixed(0)}%) in a scope with existing patients. Verify this is correct.`
          );
        }
      }

      // Log warnings if any
      if (warnings.length > 0) {
        console.warn('[ReconciliationStore] Pre-commit warnings:', warnings);
        // Could also show these in UI via a toast or modal
      }

      set({ phase: "submitting" });

      try {
        // Build decision payload — prefer matchResults (new format)
        let decisionPayload: any[];

        if (matchResults.length > 0) {
          decisionPayload = matchResults
            .map((result) => {
              const dec = decisions.get(result.sno);
              if (!dec || dec.action === "pending") return null;
              return {
                sno: result.sno,
                action: dec.action,
                patientId: dec.selectedPatientId,
                extractedData: {
                  name: result.extractedRow.name,
                  father_name: result.extractedRow.father_name,
                  age: result.extractedRow.age,
                  ward: result.extractedRow.ward,
                  address: result.extractedRow.address,
                  mobile: result.extractedRow.mobile,
                },
              };
            })
            .filter(Boolean);
        } else {
          // Legacy format
          decisionPayload = rows
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
        }

        // Build session context for API
        const sessionContext = {
          selectedDate: resolvedDate,
          facilityName: scopeContext?.facilityName ?? facilityName,
          screeningDistrict: scopeContext?.screeningDistrict ?? screeningDistrict,
          screeningState: scopeContext?.screeningState ?? screeningState,
          scopeMode: scopeContext?.scopeMode ?? scopeMode ?? 'date_only',
          sessionId: scopeContext?.sessionId ?? sessionId,
          isEmptyScope,
          scopedCandidateCount: scopedSummary?.scopedCandidateCount ?? 0,
        };

        const res = await fetch("/api/register-reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extractionId,
            decisions: decisionPayload,
            sessionContext,
          }),
        });

        const result = await res.json();

        set({
          phase: "complete",
          submitResult: {
            success: result.success ?? true,
            accepted: result.accepted || 0,
            created: result.created || 0,
            rejected: result.rejected || 0,
            duplicatesSkipped: result.duplicatesSkipped || 0,
            total: result.total || 0,
            errors: result.errors || [],
            dbCommitted: result.dbCommitted ?? true,
            sheetsTriggered: result.sheetsTriggered ?? false,
            sheetsError: result.sheetsError ?? null,
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
      const { rows, decisions, extractionId, selectedDate, facilityName, screeningDistrict, screeningState, scopeMode, sessionId } = get();
      const row = rows.find((r) => r.sno === sno);
      const decision = decisions.get(sno);
      if (!row || !decision) return;

      try {
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
            sessionContext: {
              selectedDate,
              facilityName,
              screeningDistrict,
              screeningState,
              scopeMode,
              sessionId,
            },
          }),
        });

        if (!syncRes.ok) {
          throw new Error("Sync failed");
        }

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

        // Session context reset
        sessionId: null,
        selectedDate: null,
        facilityName: null,
        screeningDistrict: null,
        screeningState: null,
        scopeMode: "date_only",
        sourceFileName: null,
        sourceFileHash: null,

        extractionId: null,
        rows: [],
        matchResults: [],
        summary: null,
        scopedSummary: null,
        modelVersion: null,
        latencyMs: null,
        extractionError: null,
        parseWarnings: [],
        streamingProgress: 0,
        totalRows: 0,
        decisions: new Map(),
        submitResult: null,
        notificationResults: [],
        source: null,
        isReviewOpen: false,
      });
    },

    // ── Handoff Setters (legacy compat) ──
    setExtractionData: (data) => {
      const decisions = new Map<number, RowDecision>();
      for (const row of data.rows) {
        if (row.sno == null) continue;
        const topMatch = row.matches?.[0];
        if (topMatch && (topMatch as any).confidenceTier === "auto_match") {
          decisions.set(row.sno, {
            action: "accept",
            selectedPatientId: topMatch.patientId,
          });
        } else {
          decisions.set(row.sno, { action: "pending" });
        }
      }

      set({
        extractionId: data.extractionId,
        rows: data.rows,
        summary: data.summary,
        source: data.source,
        modelVersion: data.modelVersion || null,
        latencyMs: data.latencyMs || null,
        decisions,
        phase: "review",
        isReviewOpen: true,
      });
    },

    setIsReviewOpen: (open: boolean) => set({ isReviewOpen: open }),
    setPhase: (phase: WorkflowPhase) => set({ phase }),

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
      break;

    case "extraction_complete":
      set({
        totalRows: data.totalRows,
        modelVersion: data.modelVersion,
        latencyMs: data.latencyMs,
      });
      break;

    case "row":
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
