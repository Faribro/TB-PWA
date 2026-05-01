/**
 * State Normalization Utility
 * Ensures consistent state names across webhook ingestion, database, and UI
 * Uses intelligent normalization logic instead of exhaustive mapping
 */

// Canonical state names (28 States + 8 UTs)
const CANONICAL_STATES = [
  // States
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

// Common abbreviations and aliases
const STATE_ALIASES: Record<string, string> = {
  'AP': 'Andhra Pradesh',
  'AR': 'Arunachal Pradesh',
  'AS': 'Assam',
  'BR': 'Bihar',
  'CG': 'Chhattisgarh',
  'GA': 'Goa',
  'GJ': 'Gujarat',
  'HR': 'Haryana',
  'HP': 'Himachal Pradesh',
  'JH': 'Jharkhand',
  'KA': 'Karnataka',
  'KL': 'Kerala',
  'MP': 'Madhya Pradesh',
  'MH': 'Maharashtra',
  'MN': 'Manipur',
  'ML': 'Meghalaya',
  'MZ': 'Mizoram',
  'NL': 'Nagaland',
  'OR': 'Odisha',
  'PB': 'Punjab',
  'RJ': 'Rajasthan',
  'SK': 'Sikkim',
  'TN': 'Tamil Nadu',
  'TG': 'Telangana',
  'TR': 'Tripura',
  'UP': 'Uttar Pradesh',
  'UK': 'Uttarakhand',
  'WB': 'West Bengal',
  'AN': 'Andaman and Nicobar Islands',
  'CH': 'Chandigarh',
  'DN': 'Dadra and Nagar Haveli and Daman and Diu',
  'DL': 'Delhi',
  'JK': 'Jammu and Kashmir',
  'LA': 'Ladakh',
  'LD': 'Lakshadweep',
  'PY': 'Puducherry',
  // Common aliases
  'NCR': 'Delhi',
  'Mumbai': 'Maharashtra',
  'Orissa': 'Odisha',
  'Pondicherry': 'Puducherry',
  'Uttaranchal': 'Uttarakhand',
};

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching state names
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Normalize string for comparison
 * - Lowercase
 * - Remove special characters
 * - Remove extra spaces
 * - Remove common words (and, &, etc.)
 */
function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')        // Normalize spaces
    .replace(/\b(and|the)\b/g, '') // Remove common words
    .trim();
}

/**
 * Find best matching canonical state using fuzzy matching
 */
function findBestMatch(input: string): string | null {
  const normalized = normalizeForComparison(input);
  let bestMatch: string | null = null;
  let bestScore = Infinity;
  const threshold = 3; // Max edit distance allowed

  for (const canonical of CANONICAL_STATES) {
    const canonicalNormalized = normalizeForComparison(canonical);
    const distance = levenshteinDistance(normalized, canonicalNormalized);

    if (distance < bestScore) {
      bestScore = distance;
      bestMatch = canonical;
    }

    // Early exit for exact match
    if (distance === 0) break;
  }

  // Only return match if within threshold
  return bestScore <= threshold ? bestMatch : null;
}

/**
 * Normalize state name to canonical form using intelligent logic
 * 
 * Algorithm:
 * 1. Check if null/empty → return null
 * 2. Trim and check abbreviation lookup → return canonical
 * 3. Check exact case-insensitive match → return canonical
 * 4. Use fuzzy matching (Levenshtein distance) → return best match
 * 5. If no match found → log warning and return original (Title Case)
 * 
 * @param state - Raw state name from Kobo/user input
 * @returns Canonical state name or null
 */
export function normalizeState(state: string | null | undefined): string | null {
  if (!state) return null;
  
  const trimmed = state.trim();
  if (!trimmed) return null;
  
  // Step 1: Check abbreviation/alias lookup (fast path)
  const upperTrimmed = trimmed.toUpperCase();
  if (STATE_ALIASES[upperTrimmed]) {
    return STATE_ALIASES[upperTrimmed];
  }
  
  // Step 2: Check exact case-insensitive match
  const exactMatch = CANONICAL_STATES.find(
    canonical => canonical.toLowerCase() === trimmed.toLowerCase()
  );
  if (exactMatch) return exactMatch;
  
  // Step 3: Fuzzy matching for typos and variations
  const fuzzyMatch = findBestMatch(trimmed);
  if (fuzzyMatch) {
    console.log(`[stateMapper] Fuzzy matched "${state}" → "${fuzzyMatch}"`);
    return fuzzyMatch;
  }
  
  // Step 4: No match found - return Title Case version with warning
  const titleCase = trimmed
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  console.warn(`[stateMapper] Unknown state: "${state}" - using Title Case: "${titleCase}"`);
  return titleCase;
}

/**
 * Normalize district name to Title Case
 */
export function normalizeDistrict(district: string | null | undefined): string | null {
  if (!district) return null;
  const trimmed = district.trim();
  if (!trimmed) return null;
  
  // Convert to Title Case
  return trimmed
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
