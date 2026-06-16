-- Enable realtime publication for patients table
ALTER PUBLICATION supabase_realtime ADD TABLE patients;

-- Add index to speed up realtime filter queries
CREATE INDEX IF NOT EXISTS idx_patients_screening_state
  ON patients(screening_state);

CREATE INDEX IF NOT EXISTS idx_patients_synced_to_sheets
  ON patients(synced_to_sheets)
  WHERE synced_to_sheets = false;
