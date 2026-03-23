/**
 * Aggressive String Normalizer for Geographic Names
 * Ensures robust matching between Supabase data and GeoJSON properties
 * 
 * Examples:
 * - "Mumbai District " -> "mumbai"
 * - "Mumbai City" -> "mumbai"
 * - "mumbai suburban" -> "mumbaisuburban"
 * - "New Delhi Urban" -> "newdelhi"
 */

const GEOGRAPHIC_SUFFIXES = [
  'district',
  'city',
  'rural',
  'urban',
  'municipality',
  'corporation',
  'municipal',
  'nagar',
  'town',
  'taluk',
  'tehsil',
  'block',
  'division'
];

export function normalizeGeographicKey(input: string | null | undefined): string {
  if (!input) return '';

  let normalized = input.toLowerCase().trim();

  // Remove all geographic suffixes
  GEOGRAPHIC_SUFFIXES.forEach(suffix => {
    const regex = new RegExp(`\\s*${suffix}\\s*$`, 'gi');
    normalized = normalized.replace(regex, '');
  });

  // Strip ALL spaces, punctuation, and special characters
  normalized = normalized.replace(/[^a-z0-9]/g, '');

  return normalized;
}

/**
 * Debug helper to see normalization results
 */
export function debugNormalization(input: string): void {
  console.log(`🔍 Normalizing: "${input}" -> "${normalizeGeographicKey(input)}"`);
}
