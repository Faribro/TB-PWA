/**
 * lib/db/sanitizePatientUpdate.ts
 * 
 * Strips non-database fields from patient update payloads
 * to prevent "column not found" errors in Supabase.
 */

const NON_DB_FIELDS = new Set([
  'client_timestamp',
  '_optimistic',
  '_localId',
  '_dirty',
  'matches',
  'matchStatus',
  'Serial Number',
  'KoboUUID',
  'KoboID',
]);

export function sanitizePatientUpdate(
  body: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(body).filter(
      ([key]) => !NON_DB_FIELDS.has(key)
    )
  );
}
