-- Migration: create sheets_sync_queue table with source field and sheet_tab
CREATE TABLE IF NOT EXISTS sheets_sync_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  fields jsonb NOT NULL,
  source text NOT NULL DEFAULT 'unknown',
  sheet_tab text NOT NULL DEFAULT 'Patient Linelist_TB',
  attempts int DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now(),
  synced_at timestamptz
);
