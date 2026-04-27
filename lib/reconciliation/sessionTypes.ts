/**
 * lib/reconciliation/sessionTypes.ts
 *
 * Shared type definitions for the date-scoped reconciliation pipeline.
 * This is the single source of truth for the session context, extracted rows,
 * matching results, and commit payloads. All layers reference these types.
 *
 * Source-agnostic: designed so future OCR/PDF extraction can produce the
 * same NormalizedExtractedRow without changing reconciliation logic.
 */

// ═══════════════════════════════════════════════════════
// Session Context — flows from Vertex → Store → API
// ═══════════════════════════════════════════════════════

export type ScopeMode = 'date_only' | 'date_facility';

export type SourceType = 'spreadsheet' | 'image' | 'pdf';

export interface ReconciliationSessionContext {
  /** Unique session ID for audit trail */
  sessionId: string;

  /** The screening date being gap-filled (YYYY-MM-DD) */
  selectedDate: string;

  /** Facility name — null if date-only mode */
  facilityName: string | null;

  /** Geographic filters from Vertex state */
  screeningDistrict: string | null;
  screeningState: string | null;

  /** Whether matching is scoped to facility or date-only */
  scopeMode: ScopeMode;

  /** Uploaded file metadata for audit */
  sourceFileName: string;
  sourceFileHash: string | null;
  sourceType: SourceType;

  /** User attribution */
  uploadedBy: string;
  uploadedAt: string;
}

// ═══════════════════════════════════════════════════════
// Normalized Extracted Row — source-agnostic output
// ═══════════════════════════════════════════════════════

export interface NormalizedExtractedRow {
  /** 1-based serial from the source file */
  sno: number;

  /** Raw name as extracted */
  name: string | null;
  /** Uppercased, whitespace-collapsed, trimmed */
  normalizedName: string | null;

  father_name: string | null;

  /** Sanitized to integer 1-120 or null */
  age: number | null;

  /** Sanitized to 10-digit Indian mobile or null */
  mobile: string | null;
  /** Digits-only, last 10 chars */
  normalizedMobile: string | null;

  ward: string | null;
  address: string | null;

  /** 0-1 confidence. 1.0 for digital sources like Excel */
  confidence_score: number;

  /**
   * Deterministic fingerprint for duplicate detection.
   * Format: normalizedName|age|normalizedMobile
   */
  rowFingerprint: string;

  /** Snapshot of the raw input values before normalization */
  rawInputSnapshot: Record<string, string | number | null>;

  /** Flagged as duplicate within the uploaded file */
  isDuplicateInFile: boolean;

  /** Index of the first occurrence if this is a duplicate */
  duplicateOfSno: number | null;
}

// ═══════════════════════════════════════════════════════
// Extraction Result — output of any extractor
// ═══════════════════════════════════════════════════════

export interface ExtractionParseResult {
  rows: NormalizedExtractedRow[];

  /** Stats about the parse */
  summary: {
    totalRowsParsed: number;
    validRows: number;
    invalidRows: number;
    duplicatesInFile: number;
  };

  /** Source metadata */
  engine: string;
  sourceType: SourceType;
  latencyMs: number;

  /** Warnings to show the user */
  warnings: string[];
}

// ═══════════════════════════════════════════════════════
// Match Result — per-candidate scoring
// ═══════════════════════════════════════════════════════

export type ConfidenceTier = 'auto_match' | 'needs_review' | 'new_record';
export type MatchClassification =
  | 'auto_match'
  | 'needs_review'
  | 'new_record'
  | 'duplicate_in_file'
  | 'duplicate_in_scope';

export interface ScoredCandidate {
  patientId: string;
  patientName: string;
  patientAge: string | null;
  patientMobile: string | null;
  patientFacility: string | null;

  /** Individual signal scores */
  mobileExactMatch: boolean;
  nameExactMatch: boolean;
  phoneticMatch: boolean;
  tokenOverlap: number;
  ageDelta: number;
  facilityMatch: boolean;

  /** Composite 0-1 score */
  compositeScore: number;
  confidenceTier: ConfidenceTier;

  /** Human-readable reason chips for the UI */
  matchReasons: string[];

  /** AI-enhanced match (if AI was used) */
  aiMatch?: {
    isMatch: boolean;
    confidence: number;
    reasons: string[];
  };
}

export interface RowMatchResult {
  sno: number;
  extractedRow: NormalizedExtractedRow;
  candidates: ScoredCandidate[];
  classification: MatchClassification;
  /** True if this row already exists in the DB for this date/scope */
  existsInScope: boolean;
}

// ═══════════════════════════════════════════════════════
// Scoped Match Options — controls candidate fetch
// ═══════════════════════════════════════════════════════

export interface ScopedMatchOptions {
  screeningDate: string;
  facilityName?: string | null;
  screeningDistrict?: string | null;
  screeningState?: string | null;
  scopeMode: ScopeMode;
  useAI?: boolean; // Enable AI fallback for ambiguous scores
}

// ═══════════════════════════════════════════════════════
// Review Decisions — user actions per row
// ═══════════════════════════════════════════════════════

export type RowAction = 'accept' | 'create' | 'reject' | 'pending';

export interface RowDecision {
  action: RowAction;
  selectedPatientId?: string;
  notified?: boolean;
}

// ═══════════════════════════════════════════════════════
// Commit Payload — sent to /api/register-reconcile
// ═══════════════════════════════════════════════════════

export interface ReconcileCommitPayload {
  sessionContext: ReconciliationSessionContext;
  extractionId: string;
  decisions: Array<{
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
  }>;
}

// ═══════════════════════════════════════════════════════
// Commit Response — from /api/register-reconcile
// ═══════════════════════════════════════════════════════

export interface ReconcileCommitResponse {
  success: boolean;
  created: number;
  accepted: number;
  rejected: number;
  duplicatesSkipped: number;
  total: number;
  errors: Array<{ sno: number; error: string }>;

  /** DB commit succeeded */
  dbCommitted: boolean;

  /** Google Sheets sync status */
  sheetsTriggered: boolean;
  sheetsError: string | null;
}

// ═══════════════════════════════════════════════════════
// Extraction Summary for Store
// ═══════════════════════════════════════════════════════

export interface ReconciliationSummary {
  autoMatch: number;
  needsReview: number;
  newRecord: number;
  duplicateInFile: number;
  duplicateInScope: number;
  /** True when the scoped candidate pool is empty — no patients exist for this date/facility */
  isEmptyScope: boolean;
  /** Number of existing patients in scope (for display) */
  scopedCandidateCount: number;
}
