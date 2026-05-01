/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ENTERPRISE-GRADE STATE NORMALIZATION PIPELINE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Architecture: Registry-Based Canonical Data Pipeline
 * Pattern: Strategy Pattern with Multi-Stage Transformation
 * Performance: O(1) exact lookups, O(N) fuzzy fallback (N=36 states)
 * Observability: Audit trail for unknown inputs
 * 
 * Pipeline Stages:
 * 1. Sanitization (trim, lowercase, strip punctuation)
 * 2. Abbreviation Resolution (O(1) Map lookup)
 * 3. Canonical Token Matching (O(1) Set lookup)
 * 4. Fuzzy Distance Matching (Levenshtein, threshold < 2)
 * 5. Audit Logging (unknown entries)
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export type NormalizationConfidence = 'exact' | 'fuzzy' | 'unknown';

export interface NormalizationResult {
  normalizedName: string | null;
  confidence: NormalizationConfidence;
  original: string;
  matchedVia?: 'canonical' | 'abbreviation' | 'alias' | 'fuzzy' | 'fallback';
  distance?: number;
}

export interface StateRegistry {
  canonical: readonly string[];
  abbreviations: ReadonlyMap<string, string>;
  aliases: ReadonlyMap<string, string>;
  synonyms: ReadonlyMap<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

const CANONICAL_STATES: readonly string[] = Object.freeze([
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
]);

const ABBREVIATION_REGISTRY = new Map<string, string>([
  ['AP', 'Andhra Pradesh'], ['AR', 'Arunachal Pradesh'], ['AS', 'Assam'],
  ['BR', 'Bihar'], ['CG', 'Chhattisgarh'], ['GA', 'Goa'], ['GJ', 'Gujarat'],
  ['HR', 'Haryana'], ['HP', 'Himachal Pradesh'], ['JH', 'Jharkhand'],
  ['KA', 'Karnataka'], ['KL', 'Kerala'], ['MP', 'Madhya Pradesh'],
  ['MH', 'Maharashtra'], ['MN', 'Manipur'], ['ML', 'Meghalaya'],
  ['MZ', 'Mizoram'], ['NL', 'Nagaland'], ['OR', 'Odisha'], ['PB', 'Punjab'],
  ['RJ', 'Rajasthan'], ['SK', 'Sikkim'], ['TN', 'Tamil Nadu'],
  ['TG', 'Telangana'], ['TR', 'Tripura'], ['UP', 'Uttar Pradesh'],
  ['UK', 'Uttarakhand'], ['UT', 'Uttarakhand'], ['WB', 'West Bengal'],
  ['AN', 'Andaman and Nicobar Islands'], ['CH', 'Chandigarh'],
  ['DN', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['DD', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['DL', 'Delhi'], ['JK', 'Jammu and Kashmir'], ['LA', 'Ladakh'],
  ['LD', 'Lakshadweep'], ['PY', 'Puducherry'],
]);

const ALIAS_REGISTRY = new Map<string, string>([
  ['orissa', 'Odisha'], ['pondicherry', 'Puducherry'],
  ['uttaranchal', 'Uttarakhand'], ['uttrakhand', 'Uttarakhand'],
  ['uttrakand', 'Uttarakhand'], ['maharashtr', 'Maharashtra'],
  ['chattisgarh', 'Chhattisgarh'], ['chhatisgarh', 'Chhattisgarh'],
  ['jharkand', 'Jharkhand'], ['maharastra', 'Maharashtra'],
  ['andhrapradesh', 'Andhra Pradesh'],
  ['arunachalpradesh', 'Arunachal Pradesh'],
  ['himachalpradesh', 'Himachal Pradesh'], ['madhyapradesh', 'Madhya Pradesh'],
  ['tamilnadu', 'Tamil Nadu'], ['uttarpradesh', 'Uttar Pradesh'],
  ['westbengal', 'West Bengal'], ['andhra_pradesh', 'Andhra Pradesh'],
  ['arunachal_pradesh', 'Arunachal Pradesh'],
  ['himachal_pradesh', 'Himachal Pradesh'], ['madhya_pradesh', 'Madhya Pradesh'],
  ['tamil_nadu', 'Tamil Nadu'], ['uttar_pradesh', 'Uttar Pradesh'],
  ['west_bengal', 'West Bengal'], ['j&k', 'Jammu and Kashmir'],
  ['jk', 'Jammu and Kashmir'], ['jammu & kashmir', 'Jammu and Kashmir'],
  ['dadra and nagar haveli', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['daman and diu', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['andaman', 'Andaman and Nicobar Islands'],
]);

const SYNONYM_REGISTRY = new Map<string, string>([
  ['mumbai', 'Maharashtra'], ['pune', 'Maharashtra'], ['nagpur', 'Maharashtra'],
  ['bangalore', 'Karnataka'], ['bengaluru', 'Karnataka'],
  ['chennai', 'Tamil Nadu'], ['madras', 'Tamil Nadu'],
  ['hyderabad', 'Telangana'], ['kolkata', 'West Bengal'],
  ['calcutta', 'West Bengal'], ['ahmedabad', 'Gujarat'], ['surat', 'Gujarat'],
  ['jaipur', 'Rajasthan'], ['lucknow', 'Uttar Pradesh'],
  ['kanpur', 'Uttar Pradesh'], ['patna', 'Bihar'], ['bhopal', 'Madhya Pradesh'],
  ['indore', 'Madhya Pradesh'], ['kochi', 'Kerala'], ['cochin', 'Kerala'],
  ['new delhi', 'Delhi'], ['ncr', 'Delhi'], ['noida', 'Uttar Pradesh'],
  ['gurgaon', 'Haryana'], ['gurugram', 'Haryana'],
]);

const CANONICAL_MAP = new Map(CANONICAL_STATES.map(s => [s.toLowerCase(), s]));

// ═══════════════════════════════════════════════════════════════════════════
// SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════

function sanitize(input: string): string {
  return input.trim().toLowerCase()
    .replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ')
    .replace(/_/g, ' ').trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// LEVENSHTEIN DISTANCE
// ═══════════════════════════════════════════════════════════════════════════

function levenshteinDistance(str1: string, str2: string, maxDistance = 2): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (Math.abs(len1 - len2) > maxDistance) return maxDistance + 1;

  const shorter = len1 < len2 ? str1 : str2;
  const longer = len1 < len2 ? str2 : str1;
  const shorterLen = shorter.length;
  const longerLen = longer.length;

  let prevRow = Array.from({ length: shorterLen + 1 }, (_, i) => i);
  let currRow = new Array(shorterLen + 1);

  for (let i = 1; i <= longerLen; i++) {
    currRow[0] = i;
    let minInRow = i;

    for (let j = 1; j <= shorterLen; j++) {
      const cost = longer[i - 1] === shorter[j - 1] ? 0 : 1;
      currRow[j] = Math.min(prevRow[j] + 1, currRow[j - 1] + 1, prevRow[j - 1] + cost);
      minInRow = Math.min(minInRow, currRow[j]);
    }

    if (minInRow > maxDistance) return maxDistance + 1;
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[shorterLen];
}

function findFuzzyMatch(sanitized: string): { match: string; distance: number } | null {
  let bestMatch: string | null = null;
  let bestDistance = 2;

  for (const canonical of CANONICAL_STATES) {
    const distance = levenshteinDistance(sanitized, canonical.toLowerCase(), bestDistance);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = canonical;
    }
    if (distance === 0) break;
  }

  return bestMatch ? { match: bestMatch, distance: bestDistance } : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════════════════

const AUDIT_LOG: Array<{ input: string; timestamp: Date }> = [];

function auditUnknownState(input: string): void {
  AUDIT_LOG.push({ input, timestamp: new Date() });
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[StateNormalization] Unknown state: "${input}"`);
  }
}

export function getAuditLog(): ReadonlyArray<{ input: string; timestamp: Date }> {
  return Object.freeze([...AUDIT_LOG]);
}

export function clearAuditLog(): void {
  AUDIT_LOG.length = 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

export function normalizeState(input: string | null | undefined): NormalizationResult {
  if (!input || !input.trim()) {
    return { normalizedName: null, confidence: 'unknown', original: input || '', matchedVia: 'fallback' };
  }

  const original = input.trim();
  const sanitized = sanitize(original);
  const upperInput = original.toUpperCase();

  if (ABBREVIATION_REGISTRY.has(upperInput)) {
    return { normalizedName: ABBREVIATION_REGISTRY.get(upperInput)!, confidence: 'exact', original, matchedVia: 'abbreviation' };
  }

  if (CANONICAL_MAP.has(sanitized)) {
    return { normalizedName: CANONICAL_MAP.get(sanitized)!, confidence: 'exact', original, matchedVia: 'canonical' };
  }

  if (ALIAS_REGISTRY.has(sanitized)) {
    return { normalizedName: ALIAS_REGISTRY.get(sanitized)!, confidence: 'exact', original, matchedVia: 'alias' };
  }

  if (SYNONYM_REGISTRY.has(sanitized)) {
    return { normalizedName: SYNONYM_REGISTRY.get(sanitized)!, confidence: 'exact', original, matchedVia: 'alias' };
  }

  const fuzzyResult = findFuzzyMatch(sanitized);
  if (fuzzyResult) {
    return { normalizedName: fuzzyResult.match, confidence: 'fuzzy', original, matchedVia: 'fuzzy', distance: fuzzyResult.distance };
  }

  auditUnknownState(original);
  return { normalizedName: null, confidence: 'unknown', original, matchedVia: 'fallback' };
}

export function isIndianState(input: string | null | undefined): boolean {
  if (!input) return false;
  const result = normalizeState(input);
  return result.normalizedName !== null;
}

export function getCanonicalStates(): readonly string[] {
  return CANONICAL_STATES;
}

export function getStateRegistry(): StateRegistry {
  return {
    canonical: CANONICAL_STATES,
    abbreviations: ABBREVIATION_REGISTRY,
    aliases: ALIAS_REGISTRY,
    synonyms: SYNONYM_REGISTRY,
  };
}

export function normalizeDistrict(district: string | null | undefined): string | null {
  if (!district) return null;
  const trimmed = district.trim();
  if (!trimmed) return null;
  
  return trimmed.toLowerCase().split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
