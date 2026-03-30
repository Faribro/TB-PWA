/**
 * Advanced fuzzy lookup for staff name matching
 * Handles case differences, spacing, partial names
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface FuzzyLookupResult<T> {
  data: T[];
  strategy: 'exact' | 'contains' | 'word-match' | 'none';
}

/**
 * Performs multi-strategy fuzzy lookup on staff_name column
 * 
 * Strategy 1: Exact case-insensitive match (e.g., "Javed Hussain" = "javed hussain")
 * Strategy 2: Contains match (e.g., "Javed" matches "Javed Hussain")
 * Strategy 3: Word-by-word match (e.g., "Hussain" matches "Javed Hussain")
 */
export async function fuzzyStaffLookup<T = any>(
  supabase: SupabaseClient,
  staffName: string,
  selectQuery: string = '*',
  limit: number = 50
): Promise<FuzzyLookupResult<T>> {
  if (!staffName?.trim()) {
    return { data: [], strategy: 'none' };
  }

  const cleanName = staffName.trim();

  // STRATEGY 1: Exact case-insensitive match
  const { data: exactMatch } = await supabase
    .from('patients')
    .select(selectQuery)
    .ilike('staff_name', cleanName)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (exactMatch?.length) {
    return { data: exactMatch, strategy: 'exact' };
  }

  // STRATEGY 2: Contains match (first word)
  const words = cleanName.split(/\s+/);
  const firstWord = words[0];

  if (firstWord.length > 2) {
    const { data: containsMatch } = await supabase
      .from('patients')
      .select(selectQuery)
      .ilike('staff_name', `%${firstWord}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (containsMatch?.length) {
      return { data: containsMatch, strategy: 'contains' };
    }
  }

  // STRATEGY 3: Word-by-word match
  const significantWords = words.filter(w => w.length > 2);
  
  for (const word of significantWords) {
    const { data: wordMatch } = await supabase
      .from('patients')
      .select(selectQuery)
      .ilike('staff_name', `%${word}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (wordMatch?.length) {
      return { data: wordMatch, strategy: 'word-match' };
    }
  }

  return { data: [], strategy: 'none' };
}
