import { useMemo } from 'react';

// ─── Pre-compiled constants (zero re-allocation on every render) ────────────

/** Matches any string that is a known garbage placeholder (case-insensitive). */
const SHADOW_PLACEHOLDER_RE = /^\s*(unknown|n\/a|na|nil|---?|test|none|n\.a\.)\s*$/i;

/**
 * Flags a name as "nominal garbage" if ANY of the following are true:
 *  1. Contains a digit            → e.g. "Raj123"
 *  2. Contains NO vowel           → e.g. "sdfgh"
 *  3. Is 1–2 characters long      → e.g. "A", "XZ"
 */
const NAME_HAS_DIGIT_RE = /\d/;
const NAME_NO_VOWEL_RE = /^[^aeiouAEIOU]+$/;

/** Critical string fields to scan for shadow/placeholder values. */
const SHADOW_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'inmate_name', label: 'Patient Name' },
  { key: 'unique_id', label: 'Unique ID' },
  { key: 'facility_name', label: 'Facility Name' },
];

const MS_PER_DAY = 86_400_000;

/** Minimum valid screening year — anything earlier is almost certainly a DOB entry. */
const MIN_SCREENING_YEAR = 2024;

// ─── Types ───────────────────────────────────────────────────────────────────

interface Patient {
  id: number;
  inmate_name?: string;
  unique_id?: string;
  facility_name?: string;
  screening_date?: string;
  referral_date?: string;
  tb_diagnosed?: string;
  att_start_date?: string;
  [key: string]: any;
}

export interface IntegrityViolation {
  id: string;
  patient: Patient;
  violation: string;
  severity: 'high' | 'medium';
  impactScore: number;
  suggestion: string;
}

export interface TruthEngineResult {
  violations: IntegrityViolation[];
  healthScore: number;
  highCount: number;
  mediumCount: number;
}

// ─── Main hook ───────────────────────────────────────────────────────────────

/**
 * useTruthEngine
 *
 * Single-pass O(n) audit of the globalPatients array.
 * Returns violations array and calculated health score.
 *
 * Violation categories:
 *  • TEMPORAL   – screening_date year < 2024  (DOB entered instead of screen date)
 *  • SHADOW     – critical fields contain garbage placeholders
 *  • NOMINAL    – inmate_name fails basic name-quality checks
 *  • CASCADE    – date ordering breaches in the clinical pathway
 */
export function useTruthEngine(globalPatients: Patient[]): TruthEngineResult {
  return useMemo<TruthEngineResult>(() => {
    if (!globalPatients || globalPatients.length === 0) {
      return { violations: [], healthScore: 100, highCount: 0, mediumCount: 0 };
    }

    const violations: IntegrityViolation[] = [];

    // Single pass — O(n)
    for (const patient of globalPatients) {
      const pid = String(patient.id);

      // ── Parse dates once per patient (no repeated allocations) ──────────
      let screenDate: Date | null = null;
      let refDate: Date | null = null;
      let attDate: Date | null = null;

      if (patient.screening_date) {
        const d = new Date(patient.screening_date);
        if (!isNaN(d.getTime())) screenDate = d;
      }
      if (patient.referral_date) {
        const d = new Date(patient.referral_date);
        if (!isNaN(d.getTime())) refDate = d;
      }
      if (patient.att_start_date) {
        const d = new Date(patient.att_start_date);
        if (!isNaN(d.getTime())) attDate = d;
      }

      // ── 1. TEMPORAL ANOMALY: screening year < 2024 ──────────────────────
      if (screenDate && screenDate.getFullYear() < MIN_SCREENING_YEAR) {
        violations.push({
          id: `${pid}-temporal`,
          patient,
          violation: `Screening date is ${screenDate.getFullYear()} — predates program start.`,
          severity: 'high',
          impactScore: 95,
          suggestion: 'Field worker likely entered Date of Birth. Verify & correct to actual screening date.',
        });
      }

      // ── 2. SHADOW / PLACEHOLDER VALUES ──────────────────────────────────
      for (const field of SHADOW_FIELDS) {
        const raw = patient[field.key];
        if (typeof raw === 'string' && SHADOW_PLACEHOLDER_RE.test(raw)) {
          violations.push({
            id: `${pid}-shadow-${field.key}`,
            patient,
            violation: `${field.label} contains a placeholder value: "${raw.trim()}"`,
            severity: 'high',
            impactScore: 80,
            suggestion: `Replace "${raw.trim()}" with verified data or mark record for follow-up.`,
          });
        }
      }

      // ── 3. NOMINAL GARBAGE: name quality checks ──────────────────────────
      const name = patient.inmate_name?.trim() ?? '';

      if (name.length > 0) {
        if (name.length <= 2) {
          violations.push({
            id: `${pid}-name-short`,
            patient,
            violation: `Name "${name}" is suspiciously short (${name.length} char).`,
            severity: 'medium',
            impactScore: 60,
            suggestion: 'Confirm full name with facility register; may be initials or a truncation error.',
          });
        } else if (NAME_HAS_DIGIT_RE.test(name)) {
          violations.push({
            id: `${pid}-name-digit`,
            patient,
            violation: `Name "${name}" contains a numeric character.`,
            severity: 'medium',
            impactScore: 65,
            suggestion: 'Names should not contain digits. Verify if this is a misplaced ID or data-entry error.',
          });
        } else if (NAME_NO_VOWEL_RE.test(name)) {
          violations.push({
            id: `${pid}-name-vowel`,
            patient,
            violation: `Name "${name}" contains no vowels — likely keyboard garbage or abbreviation.`,
            severity: 'medium',
            impactScore: 70,
            suggestion: 'Cross-check with physical register. This pattern suggests a data-entry slip.',
          });
        }
      }

      // ── 4. LOGICAL CASCADE BREACHES ──────────────────────────────────────

      // 4a. Referral date is before screening date
      if (refDate && screenDate && refDate < screenDate) {
        const dayDiff = Math.round((screenDate.getTime() - refDate.getTime()) / MS_PER_DAY);
        violations.push({
          id: `${pid}-ref-before-screen`,
          patient,
          violation: `Referral date is ${dayDiff}d before screening date.`,
          severity: 'high',
          impactScore: 88,
          suggestion: 'Check if referral and screening dates were swapped during entry.',
        });
      }

      // 4b. ATT start date is before screening date
      if (attDate && screenDate && attDate < screenDate) {
        const dayDiff = Math.round((screenDate.getTime() - attDate.getTime()) / MS_PER_DAY);
        violations.push({
          id: `${pid}-att-before-screen`,
          patient,
          violation: `ATT initiated ${dayDiff}d before screening — treatment precedes detection.`,
          severity: 'high',
          impactScore: 92,
          suggestion: 'Probable date transposition. Verify ATT start and screening dates independently.',
        });
      }

      // 4c. ATT start date is before referral date (proxy for diagnosis date)
      if (attDate && refDate && attDate < refDate) {
        const dayDiff = Math.round((refDate.getTime() - attDate.getTime()) / MS_PER_DAY);
        violations.push({
          id: `${pid}-att-before-ref`,
          patient,
          violation: `ATT initiated ${dayDiff}d before referral/diagnosis date.`,
          severity: 'high',
          impactScore: 90,
          suggestion: 'Treatment cannot start before diagnosis. Confirm sequence with clinical records.',
        });
      }

      // 4d. TB confirmed but ATT not started after 14 days
      const isTBPositive = patient.tb_diagnosed === 'Y' || patient.tb_diagnosed === 'Yes';

      if (isTBPositive && !attDate && screenDate) {
        const daysElapsed = Math.floor((Date.now() - screenDate.getTime()) / MS_PER_DAY);
        if (daysElapsed >= 14) {
          violations.push({
            id: `${pid}-att-missing`,
            patient,
            violation: `TB confirmed, no ATT recorded — ${daysElapsed}d since screening.`,
            severity: 'high',
            impactScore: Math.min(100, 70 + daysElapsed), // urgency escalates with time
            suggestion: 'Verify if patient started treatment at another facility. Update or escalate immediately.',
          });
        }
      }
    }

    // Sort: highest impact first
    const sortedViolations = violations.sort((a, b) => b.impactScore - a.impactScore);

    // Calculate health score
    const totalPatients = globalPatients.length;
    const highCount = violations.filter(v => v.severity === 'high').length;
    const mediumCount = violations.filter(v => v.severity === 'medium').length;
    
    // Health score formula: penalize high severity more heavily
    const highPenalty = (highCount / totalPatients) * 50; // High violations reduce score by up to 50%
    const mediumPenalty = (mediumCount / totalPatients) * 30; // Medium violations reduce score by up to 30%
    const healthScore = Math.max(0, Math.min(100, 100 - highPenalty - mediumPenalty));

    return {
      violations: sortedViolations,
      healthScore: Math.round(healthScore),
      highCount,
      mediumCount,
    };
  }, [globalPatients]);
}
