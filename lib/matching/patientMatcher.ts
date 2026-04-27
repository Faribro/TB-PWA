/**
 * lib/matching/patientMatcher.ts
 *
 * Scoped patient matching engine for register reconciliation.
 * Key design: deterministic blocking BEFORE fuzzy matching.
 *
 * Candidate Fetch Strategy:
 *   1. Fetch only patients matching the date + facility scope
 *   2. Perform scoring only within that candidate pool
 *   3. Never fetch all patients globally for gap-fill mode
 *
 * Scoring Signals (explainable, chip-ready):
 *   - Mobile exact match   (unconditional override → 1.0)
 *   - Exact normalized name (0.95)
 *   - Token overlap         (0.50 – 0.85)
 *   - Phonetic similarity   (0.60 base)
 *   - Age proximity         (±2yr bonus)
 *
 * Classifications:
 *   - auto_match:         compositeScore ≥ 0.60
 *   - needs_review:       compositeScore ≥ 0.40
 *   - new_record:         compositeScore < 0.40
 *   - duplicate_in_file:  flagged from extractor
 *   - duplicate_in_scope: exact fingerprint match in DB scope
 */

import { type SupabaseClient } from '@supabase/supabase-js';
import type {
  NormalizedExtractedRow,
  ScopedMatchOptions,
  ScoredCandidate,
  RowMatchResult,
  MatchClassification,
  ConfidenceTier,
  ReconciliationSummary,
} from '@/lib/reconciliation/sessionTypes';

// ═══════════════════════════════════════════════════════
// Constants (visible, tunable)
// ═══════════════════════════════════════════════════════

export const MATCH_THRESHOLDS = {
  AUTO_MATCH: 0.60,
  NEEDS_REVIEW: 0.40,
} as const;

// ═══════════════════════════════════════════════════════
// Legacy re-exports for backward compatibility
// ═══════════════════════════════════════════════════════

export type { ConfidenceTier } from '@/lib/reconciliation/sessionTypes';

export interface MatchResult {
  patientId: string;
  patientName: string;
  patientAge: string | null;
  patientMobile: string | null;
  patientFacility: string | null;
  trigramScore: number;
  metaphoneMatch: boolean;
  levenshteinDist: number;
  mobileExactMatch: boolean;
  ageDelta: number;
  compositeScore: number;
  confidenceTier: ConfidenceTier;
  matchReason: string;
}

export interface MatchParams {
  name: string;
  age?: number | null;
  mobile?: string | null;
  ocrConfidence: number;
}

export interface BulkMatchParams {
  name: string;
  age?: number | null;
  mobile?: string | null;
  ocrConfidence: number;
  sno?: number | null;
}

export interface BulkMatchResult {
  row: BulkMatchParams;
  matches: MatchResult[];
  matchStatus: ConfidenceTier;
}

// ═══════════════════════════════════════════════════════
// Internal Patient Row from DB
// ═══════════════════════════════════════════════════════

interface PatientRow {
  id: string;
  inmate_name: string | null;
  age: number | null;
  contact_number: string | null;
  unique_id: string | null;
  name_metaphone_primary: string | null;
  name_metaphone_alternate: string | null;
  name_variants: string[] | null;
  kobo_uuid: string | null;
  facility_name: string | null;
  screening_district: string | null;
  screening_date: string | null;
}

const PATIENT_SELECT = `
  id,
  inmate_name,
  age,
  contact_number,
  unique_id,
  name_metaphone_primary,
  name_metaphone_alternate,
  name_variants,
  kobo_uuid,
  facility_name,
  screening_district,
  screening_date
`;

// ═══════════════════════════════════════════════════════
// Scoring Helpers
// ═══════════════════════════════════════════════════════

function toConfidenceTier(score: number): ConfidenceTier {
  if (score >= MATCH_THRESHOLDS.AUTO_MATCH) return 'auto_match';
  if (score >= MATCH_THRESHOLDS.NEEDS_REVIEW) return 'needs_review';
  return 'new_record';
}

function normName(s: string | null | undefined): string {
  return (s ?? '').toUpperCase().replace(/\s+/g, ' ').trim();
}

function normMobile(s: string | null | undefined): string | null {
  if (!s) return null;
  const digits = s.toString().replace(/\D/g, '').slice(-10);
  return digits.length === 10 && /^[6-9]/.test(digits) ? digits : null;
}

// ═══════════════════════════════════════════════════════
// Scoped Candidate Fetch (THE KEY CHANGE)
// ═══════════════════════════════════════════════════════

/**
 * Fetches only patients within the reconciliation scope.
 * This is deterministic blocking: narrows the candidate pool
 * BEFORE any fuzzy matching happens.
 */
async function fetchScopedCandidates(
  supabase: SupabaseClient,
  options: ScopedMatchOptions,
): Promise<PatientRow[]> {
  console.log('[patientMatcher] Fetching scoped candidates:', {
    date: options.screeningDate,
    facility: options.facilityName,
    district: options.screeningDistrict,
    state: options.screeningState,
    scopeMode: options.scopeMode,
  });

  let query = supabase
    .from('patients')
    .select(PATIENT_SELECT)
    .order('created_at', { ascending: false });

  // Primary scope: always filter by screening date
  query = query.eq('screening_date', options.screeningDate);

  // Facility scope if in date_facility mode
  if (options.scopeMode === 'date_facility' && options.facilityName) {
    query = query.eq('facility_name', options.facilityName);
  }

  // Geographic scope if available
  if (options.screeningState) {
    query = query.eq('screening_state', options.screeningState);
  }
  if (options.screeningDistrict) {
    query = query.eq('screening_district', options.screeningDistrict);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[patientMatcher] Scoped fetch error:', error);
    throw new Error(`Failed to fetch scoped candidates: ${error.message}`);
  }

  const candidates = (data ?? []) as PatientRow[];
  console.log(
    `[patientMatcher] Scoped fetch returned ${candidates.length} candidates ` +
    `for date=${options.screeningDate}, facility=${options.facilityName ?? 'any'}`,
  );

  return candidates;
}

// ═══════════════════════════════════════════════════════
// In-Memory Scoring
// ═══════════════════════════════════════════════════════

function scoreCandidate(
  extracted: NormalizedExtractedRow,
  patient: PatientRow,
): ScoredCandidate {
  const dbName = normName(patient.inmate_name);
  const searchName = extracted.normalizedName ?? '';
  const dbMobile = normMobile(patient.contact_number);
  const searchMobile = extracted.normalizedMobile;

  // Individual signals
  const mobileExact = !!(searchMobile && dbMobile && searchMobile === dbMobile);
  const nameExact = !!(searchName && dbName && searchName === dbName);

  // Token overlap
  const searchTokens = searchName.split(/\s+/).filter(t => t.length > 1);
  const dbTokens = dbName.split(/\s+/).filter(t => t.length > 1);
  const overlap = searchTokens.filter(t => dbTokens.includes(t)).length;
  const tokenOverlap = searchTokens.length > 0
    ? overlap / Math.max(searchTokens.length, dbTokens.length)
    : 0;

  // Contains match
  const containsMatch =
    searchName.length > 2 &&
    dbName.length > 2 &&
    (dbName.includes(searchName) || searchName.includes(dbName));

  // Age delta
  const ageDelta = extracted.age != null && patient.age != null
    ? Math.abs(extracted.age - patient.age)
    : 999;

  // Phonetic: use metaphone columns if available
  const phoneticMatch = false; // Simplified — full metaphone in RPC path

  // Composite score
  let score: number;
  if (mobileExact) {
    score = 1.0;
  } else if (nameExact) {
    score = ageDelta <= 2 ? 0.95 : 0.90;
  } else if (containsMatch) {
    score = 0.80 + (ageDelta <= 3 ? 0.05 : 0);
  } else if (tokenOverlap > 0) {
    score = 0.50 + tokenOverlap * 0.30 + (ageDelta <= 3 ? 0.05 : 0);
  } else {
    score = 0.20;
  }

  // Reason chips
  const matchReasons: string[] = [];
  if (mobileExact) matchReasons.push('📱 Mobile exact match');
  if (nameExact) matchReasons.push('✅ Name exact match');
  if (!nameExact && containsMatch) matchReasons.push('📝 Name contains match');
  if (!nameExact && !containsMatch && tokenOverlap > 0) {
    matchReasons.push(`🔤 ${overlap}/${Math.max(searchTokens.length, dbTokens.length)} name tokens match`);
  }
  if (ageDelta <= 2) matchReasons.push('🎂 Age matches (±2yr)');
  else if (ageDelta <= 5) matchReasons.push('🎂 Age close (±5yr)');
  if (phoneticMatch) matchReasons.push('🔊 Sounds similar');

  return {
    patientId: patient.id,
    patientName: patient.inmate_name ?? '',
    patientAge: patient.age?.toString() ?? null,
    patientMobile: patient.contact_number ?? null,
    patientFacility: patient.facility_name ?? null,
    mobileExactMatch: mobileExact,
    nameExactMatch: nameExact,
    phoneticMatch,
    tokenOverlap,
    ageDelta,
    compositeScore: Math.min(1.0, score), // Clamp to 1.0
    confidenceTier: toConfidenceTier(score),
    matchReasons,
  };
}

// ═══════════════════════════════════════════════════════
// Main Scoped Matching Entry Point (NEW)
// ═══════════════════════════════════════════════════════

/**
 * Match extracted rows against a date/facility-scoped candidate pool.
 * Returns classification and candidates for each row.
 */
export async function matchRowsScoped(
  supabase: SupabaseClient,
  extractedRows: NormalizedExtractedRow[],
  options: ScopedMatchOptions,
): Promise<{
  results: RowMatchResult[];
  summary: ReconciliationSummary;
}> {
  if (!extractedRows || extractedRows.length === 0) {
    return {
      results: [],
      summary: {
        autoMatch: 0,
        needsReview: 0,
        newRecord: 0,
        duplicateInFile: 0,
        duplicateInScope: 0,
      },
    };
  }

  // Step 1: Deterministic blocking — fetch only scoped candidates
  const candidates = await fetchScopedCandidates(supabase, options);

  // Build a fingerprint set of existing DB records for exact dedup
  const dbFingerprints = new Set<string>();
  for (const c of candidates) {
    const fp = [
      normName(c.inmate_name),
      c.age?.toString() ?? '_',
      normMobile(c.contact_number) ?? '_',
    ].join('|');
    dbFingerprints.add(fp);
  }

  // Step 2: Score each extracted row against scoped candidates
  const summary: ReconciliationSummary = {
    autoMatch: 0,
    needsReview: 0,
    newRecord: 0,
    duplicateInFile: 0,
    duplicateInScope: 0,
  };

  const results: RowMatchResult[] = extractedRows.map(row => {
    // Handle duplicate-in-file first
    if (row.isDuplicateInFile) {
      summary.duplicateInFile++;
      return {
        sno: row.sno,
        extractedRow: row,
        candidates: [],
        classification: 'duplicate_in_file' as MatchClassification,
        existsInScope: false,
      };
    }

    // Check exact fingerprint match in DB scope
    const existsInScope = dbFingerprints.has(row.rowFingerprint);
    if (existsInScope) {
      summary.duplicateInScope++;
    }

    // Score against scoped candidates
    const scored = candidates
      .map(patient => scoreCandidate(row, patient))
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 3); // Top 3 candidates

    const topScore = scored[0]?.compositeScore ?? 0;
    let classification: MatchClassification;

    if (existsInScope && topScore >= MATCH_THRESHOLDS.AUTO_MATCH) {
      classification = 'auto_match';
      summary.autoMatch++;
    } else if (topScore >= MATCH_THRESHOLDS.AUTO_MATCH) {
      classification = 'auto_match';
      summary.autoMatch++;
    } else if (topScore >= MATCH_THRESHOLDS.NEEDS_REVIEW) {
      classification = 'needs_review';
      summary.needsReview++;
    } else {
      classification = 'new_record';
      summary.newRecord++;
    }

    return {
      sno: row.sno,
      extractedRow: row,
      candidates: scored,
      classification,
      existsInScope,
    };
  });

  console.log('[patientMatcher] Scoped match summary:', summary);

  return { results, summary };
}

// ═══════════════════════════════════════════════════════
// Legacy Global Matching (preserved for SSE stream path)
// ═══════════════════════════════════════════════════════

export function computeCompositeScore(row: {
  trgm_score: number;
  metaphone_match: boolean;
  levenshtein_dist: number;
  mobile_exact_match: boolean;
  age_delta: number;
}): number {
  if (row.mobile_exact_match) return 1.0;

  const WEIGHTS = { trigram: 0.45, metaphone: 0.30, levenshtein: 0.15, age: 0.10 };

  const levenshteinScore =
    row.levenshtein_dist <= 1 ? 1.0 :
    row.levenshtein_dist === 2 ? 0.6 :
    0.0;

  const ageScore =
    row.age_delta <= 2 ? 1.0 :
    row.age_delta <= 5 ? 0.5 :
    0.0;

  return (
    row.trgm_score * WEIGHTS.trigram +
    (row.metaphone_match ? 1.0 : 0.0) * WEIGHTS.metaphone +
    levenshteinScore * WEIGHTS.levenshtein +
    ageScore * WEIGHTS.age
  );
}

export function applyOCRPenalty(score: number, ocrConfidence: number): number {
  if (ocrConfidence < 0.5) return score * 0.75;
  if (ocrConfidence < 0.7) return score * 0.90;
  return score;
}

export async function matchPatient(
  supabase: SupabaseClient,
  params: MatchParams,
): Promise<MatchResult[]> {
  if (!params.name || params.name.trim().length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc('match_patient_robust', {
    p_name: params.name.trim(),
    p_age: params.age ?? null,
    p_mobile: params.mobile ?? null,
    trgm_threshold: 0.28,
    max_results: 10,
  });

  if (error) {
    console.error('[PatientMatcher] RPC error:', error);
    return [];
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  return (data as any[])
    .map((row) => {
      const raw = computeCompositeScore(row);
      const adjusted = applyOCRPenalty(raw, params.ocrConfidence);
      return {
        patientId: row.patient_id,
        patientName: row.patient_name,
        patientAge: row.patient_age,
        patientMobile: row.patient_mobile,
        patientFacility: row.patient_facility,
        trigramScore: row.trgm_score,
        metaphoneMatch: row.metaphone_match,
        levenshteinDist: row.levenshtein_dist,
        mobileExactMatch: row.mobile_exact_match,
        ageDelta: row.age_delta,
        compositeScore: adjusted,
        confidenceTier: toConfidenceTier(adjusted),
        matchReason: row.mobile_exact_match ? '📱 Mobile exact match' : 'Fuzzy match',
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 3);
}

export async function matchPatients(
  supabase: SupabaseClient,
  extractedRows: BulkMatchParams[],
  options?: ScopedMatchOptions,
): Promise<BulkMatchResult[]> {
  if (!extractedRows || extractedRows.length === 0) return [];

  console.log('[patientMatcher] matchPatients called with', extractedRows.length, 'rows');

  // Build query — now scope-aware
  let query = supabase
    .from('patients')
    .select(PATIENT_SELECT)
    .order('created_at', { ascending: false });

  if (options?.screeningDate) {
    query = query.eq('screening_date', options.screeningDate);
  }
  if (options?.scopeMode === 'date_facility' && options?.facilityName) {
    query = query.eq('facility_name', options.facilityName);
  }
  if (options?.screeningState) {
    query = query.eq('screening_state', options.screeningState);
  }
  if (options?.screeningDistrict) {
    query = query.eq('screening_district', options.screeningDistrict);
  }

  const { data: allPatients, error: fetchError } = await query;

  if (fetchError || !allPatients) {
    console.error('[patientMatcher] Fetch error:', fetchError);
    throw new Error(`Failed to fetch patients: ${fetchError?.message}`);
  }

  console.log('[patientMatcher] Candidates loaded:', allPatients.length);

  const results: BulkMatchResult[] = [];

  for (const row of extractedRows) {
    if (!row.name || row.name.trim().length === 0) {
      results.push({ row, matches: [], matchStatus: 'new_record' });
      continue;
    }

    const searchName = row.name.toUpperCase().trim();
    const searchMobile = row.mobile ? row.mobile.replace(/\D/g, '').slice(-10) : null;

    const scored: MatchResult[] = [];

    for (const p of allPatients as PatientRow[]) {
      const dbName = normName(p.inmate_name);
      if (!dbName) continue;

      const dbMobile = normMobile(p.contact_number);
      const mobileExact = !!(searchMobile && dbMobile && searchMobile === dbMobile);
      const exactMatch = dbName === searchName;
      const containsMatch = dbName.includes(searchName) || searchName.includes(dbName);
      const ageDelta = row.age != null && p.age != null
        ? Math.abs(row.age - p.age) : 999;

      // Token overlap
      const sTokens = searchName.split(/\s+/).filter(t => t.length > 1);
      const dTokens = dbName.split(/\s+/).filter(t => t.length > 1);
      const overlap = sTokens.filter(t => dTokens.includes(t)).length;

      let score: number;
      if (mobileExact) score = 1.0;
      else if (exactMatch) score = ageDelta <= 2 ? 0.95 : 0.90;
      else if (containsMatch) score = 0.80;
      else if (overlap > 0) score = 0.50 + (overlap / Math.max(sTokens.length, dTokens.length)) * 0.30;
      else continue; // No signal at all, skip

      const adjusted = applyOCRPenalty(score, row.ocrConfidence);

      scored.push({
        patientId: p.id,
        patientName: p.inmate_name ?? '',
        patientAge: p.age?.toString() ?? null,
        patientMobile: p.contact_number ?? null,
        patientFacility: p.facility_name ?? null,
        trigramScore: score,
        metaphoneMatch: false,
        levenshteinDist: 0,
        mobileExactMatch: mobileExact,
        ageDelta,
        compositeScore: adjusted,
        confidenceTier: toConfidenceTier(adjusted),
        matchReason: mobileExact ? '📱 Mobile exact match' :
                     exactMatch ? '✅ Name exact match' :
                     containsMatch ? '📝 Name contains match' :
                     `🔤 ${overlap} token overlap`,
      });
    }

    scored.sort((a, b) => b.compositeScore - a.compositeScore);
    const topMatches = scored.slice(0, 3);
    const topStatus = topMatches[0]?.confidenceTier ?? 'new_record';

    results.push({ row, matches: topMatches, matchStatus: topStatus });
  }

  return results;
}
