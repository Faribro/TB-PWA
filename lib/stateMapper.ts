/**
 * State Normalization Utility
 * Ensures consistent state names across webhook ingestion, database, and UI
 */

const STATE_MAPPING: Record<string, string> = {
  // Normalize variations to canonical names
  'gujarat': 'Gujarat',
  'GUJARAT': 'Gujarat',
  'Gujarat': 'Gujarat',
  
  'maharashtra': 'Maharashtra',
  'MAHARASHTRA': 'Maharashtra',
  'Maharashtra': 'Maharashtra',
  
  'mumbai': 'Mumbai',
  'MUMBAI': 'Mumbai',
  'Mumbai': 'Mumbai',
  
  'madhya pradesh': 'Madhya Pradesh',
  'MADHYA PRADESH': 'Madhya Pradesh',
  'Madhya Pradesh': 'Madhya Pradesh',
  'MP': 'Madhya Pradesh',
  'mp': 'Madhya Pradesh',
  
  'uttar pradesh': 'Uttar Pradesh',
  'UTTAR PRADESH': 'Uttar Pradesh',
  'Uttar Pradesh': 'Uttar Pradesh',
  'UP': 'Uttar Pradesh',
  'up': 'Uttar Pradesh',
  
  'rajasthan': 'Rajasthan',
  'RAJASTHAN': 'Rajasthan',
  'Rajasthan': 'Rajasthan',
  
  'delhi': 'Delhi',
  'DELHI': 'Delhi',
  'Delhi': 'Delhi',
  'NCR': 'Delhi',
  'ncr': 'Delhi',
};

/**
 * Normalize state name to canonical form
 * Returns null if state is invalid/unknown
 */
export function normalizeState(state: string | null | undefined): string | null {
  if (!state) return null;
  
  const trimmed = state.trim();
  if (!trimmed) return null;
  
  // Direct lookup
  const normalized = STATE_MAPPING[trimmed];
  if (normalized) return normalized;
  
  // Case-insensitive fallback
  const lowerKey = Object.keys(STATE_MAPPING).find(
    k => k.toLowerCase() === trimmed.toLowerCase()
  );
  
  if (lowerKey) return STATE_MAPPING[lowerKey];
  
  // Return original if no mapping found (log warning in production)
  console.warn(`[stateMapper] Unknown state: "${state}" - using as-is`);
  return trimmed;
}

/**
 * Normalize district name
 */
export function normalizeDistrict(district: string | null | undefined): string | null {
  if (!district) return null;
  const trimmed = district.trim();
  return trimmed || null;
}
