/**
 * lib/matching/patientMatcher.ts
 *
 * TypeScript matching service for the Register Reconciliation pipeline.
 * Calls the Supabase `match_patient_robust` RPC and applies composite scoring
 * with OCR confidence penalties to produce ranked match candidates.
 *
 * Scoring Weights (must sum to 1.0):
 *   Trigram similarity:   0.45  (catches visual OCR transpositions)
 *   Double Metaphone:     0.30  (catches phonetic equivalences: J/Y, sh/s)
 *   Levenshtein distance: 0.15  (catches single-char OCR typos)
 *   Age proximity:        0.10  (demographic sanity check)
 *
 * Mobile exact match is an unconditional override → score = 1.0.
 */

import { type SupabaseClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

export type ConfidenceTier = "auto_match" | "needs_review" | "new_record";

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
  /** Human-readable explanation of why this match was selected */
  matchReason: string;
}

export interface MatchParams {
  name: string;
  age?: number | null;
  mobile?: string | null;
  ocrConfidence: number;
}

// ═══════════════════════════════════════════════════════
// Scoring Engine
// ═══════════════════════════════════════════════════════

const WEIGHTS = {
  trigram: 0.45,
  metaphone: 0.30,
  levenshtein: 0.15,
  age: 0.10,
} as const;

/**
 * Computes the composite match score from individual signal scores.
 * Mobile exact match is an unconditional override → 1.0.
 */
export function computeCompositeScore(row: {
  trgm_score: number;
  metaphone_match: boolean;
  levenshtein_dist: number;
  mobile_exact_match: boolean;
  age_delta: number;
}): number {
  // Mobile exact match → unconditional 1.0 (override all else)
  if (row.mobile_exact_match) return 1.0;

  const levenshteinScore =
    row.levenshtein_dist <= 1
      ? 1.0
      : row.levenshtein_dist === 2
        ? 0.6
        : 0.0;

  const ageScore =
    row.age_delta <= 2 ? 1.0 : row.age_delta <= 5 ? 0.5 : 0.0;

  return (
    row.trgm_score * WEIGHTS.trigram +
    (row.metaphone_match ? 1.0 : 0.0) * WEIGHTS.metaphone +
    levenshteinScore * WEIGHTS.levenshtein +
    ageScore * WEIGHTS.age
  );
}

/**
 * Suppresses auto-match for poorly-extracted OCR rows.
 * Prevents confidently matching a name that was barely legible.
 */
export function applyOCRPenalty(
  score: number,
  ocrConfidence: number
): number {
  if (ocrConfidence < 0.5) return score * 0.75;
  if (ocrConfidence < 0.7) return score * 0.90;
  return score;
}

/**
 * Maps a composite score to a confidence tier.
 *   ≥ 0.85 → auto_match   (system links; audit log — ~40% of volume)
 *   ≥ 0.55 → needs_review  (officer picks from top-3 — ~30%)
 *   <  0.55 → new_record   (no match; officer creates or confirms — ~30%)
 */
export function toConfidenceTier(score: number): ConfidenceTier {
  if (score >= 0.85) return "auto_match";
  if (score >= 0.55) return "needs_review";
  return "new_record";
}

/**
 * Generates a human-readable match reason string for the M&E officer.
 */
function buildMatchReason(row: {
  trgm_score: number;
  metaphone_match: boolean;
  levenshtein_dist: number;
  mobile_exact_match: boolean;
  age_delta: number;
}): string {
  const reasons: string[] = [];

  if (row.mobile_exact_match) {
    reasons.push("📱 Mobile number exact match");
  }

  if (row.trgm_score >= 0.7) {
    reasons.push(`📝 Name similarity: ${(row.trgm_score * 100).toFixed(0)}%`);
  } else if (row.trgm_score >= 0.4) {
    reasons.push(`📝 Name partial match: ${(row.trgm_score * 100).toFixed(0)}%`);
  }

  if (row.metaphone_match) {
    reasons.push("🔊 Phonetic match (sounds similar)");
  }

  if (row.levenshtein_dist <= 1) {
    reasons.push("✏️ Name differs by ≤1 character");
  } else if (row.levenshtein_dist === 2) {
    reasons.push("✏️ Name differs by 2 characters");
  }

  if (row.age_delta <= 2) {
    reasons.push("🎂 Age matches closely");
  } else if (row.age_delta <= 5) {
    reasons.push("🎂 Age within ±5 years");
  }

  return reasons.length > 0
    ? reasons.join(" · ")
    : "Weak signals — manual review needed";
}

// ═══════════════════════════════════════════════════════
// Main Matching Function
// ═══════════════════════════════════════════════════════

/**
 * Matches an OCR-extracted patient against the Supabase patients table.
 * Calls the `match_patient_robust` RPC and returns the top 3 candidates
 * with scoring breakdown and confidence tiers.
 */
export async function matchPatient(
  supabase: SupabaseClient,
  params: MatchParams
): Promise<MatchResult[]> {
  if (!params.name || params.name.trim().length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc("match_patient_robust", {
    p_name: params.name.trim(),
    p_age: params.age ?? null,
    p_mobile: params.mobile ?? null,
    trgm_threshold: 0.28,
    max_results: 10,
  });

  if (error) {
    console.error("[PatientMatcher] RPC error:", error);
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
        matchReason: buildMatchReason(row),
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 3); // Top 3 candidates for M&E officer
}
