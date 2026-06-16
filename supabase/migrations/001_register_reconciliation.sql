-- ═══════════════════════════════════════════════════════
-- Migration: Register Reconciliation Infrastructure
-- Adds fuzzy matching, metaphone indexing, and extraction audit table
-- ═══════════════════════════════════════════════════════

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;   -- double metaphone, soundex, levenshtein
CREATE EXTENSION IF NOT EXISTS pg_trgm;          -- trigram similarity

-- 2. Augment patients table with matching columns
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS name_metaphone_primary   TEXT,
  ADD COLUMN IF NOT EXISTS name_metaphone_alternate TEXT,
  ADD COLUMN IF NOT EXISTS name_romanized            TEXT,
  ADD COLUMN IF NOT EXISTS name_variants             TEXT[];

-- 3. Indexes for fast fuzzy lookups
CREATE INDEX IF NOT EXISTS idx_patients_name_trgm
  ON patients USING GIN (name_romanized gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_variants_gin
  ON patients USING GIN (name_variants);

CREATE INDEX IF NOT EXISTS idx_patients_metaphone
  ON patients (name_metaphone_primary);

-- 4. Backfill: populate name_romanized from inmate_name, compute metaphone
UPDATE patients
  SET name_romanized         = COALESCE(inmate_name, ''),
      name_metaphone_primary = dmetaphone(COALESCE(inmate_name, '')),
      name_metaphone_alternate = dmetaphone_alt(COALESCE(inmate_name, ''))
  WHERE name_romanized IS NULL;

-- 5. Trigger to auto-populate on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_patient_metaphone()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name_romanized         := COALESCE(NEW.inmate_name, '');
  NEW.name_metaphone_primary := dmetaphone(COALESCE(NEW.inmate_name, ''));
  NEW.name_metaphone_alternate := dmetaphone_alt(COALESCE(NEW.inmate_name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_patient_metaphone ON patients;
CREATE TRIGGER trg_patient_metaphone
  BEFORE INSERT OR UPDATE OF inmate_name ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_metaphone();

-- 6. Register Extractions table (audit log)
CREATE TABLE IF NOT EXISTS register_extractions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      TEXT,                          -- auth user email
  image_url       TEXT,                          -- Supabase Storage path
  image_mime      TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | reviewed | committed
  extracted_rows  JSONB NOT NULL DEFAULT '[]'::jsonb,
  match_results   JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_decisions JSONB,                        -- officer's accept/create/reject per row
  committed_at    TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'::jsonb       -- model version, latency, etc.
);

CREATE INDEX IF NOT EXISTS idx_register_extractions_status
  ON register_extractions (status);
CREATE INDEX IF NOT EXISTS idx_register_extractions_created
  ON register_extractions (created_at DESC);

-- 7. Master Matching RPC
-- Combines trigram + double metaphone + levenshtein + mobile override
CREATE OR REPLACE FUNCTION match_patient_robust(
  p_name          TEXT,
  p_age           INT    DEFAULT NULL,
  p_mobile        TEXT   DEFAULT NULL,
  trgm_threshold  FLOAT  DEFAULT 0.28,
  max_results     INT    DEFAULT 10
)
RETURNS TABLE (
  patient_id          UUID,
  patient_name        TEXT,
  patient_age         TEXT,
  patient_mobile      TEXT,
  patient_facility    TEXT,
  trgm_score          FLOAT,
  metaphone_match     BOOLEAN,
  levenshtein_dist    INT,
  mobile_exact_match  BOOLEAN,
  age_delta           INT,
  composite_score     FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id                                                        AS patient_id,
    p.inmate_name                                               AS patient_name,
    p.age::TEXT                                                  AS patient_age,
    p.contact_number                                            AS patient_mobile,
    p.facility_name                                             AS patient_facility,

    -- 1. Trigram: match OCR name against DB name AND all stored variants
    GREATEST(
      similarity(p.name_romanized, p_name),
      COALESCE((
        SELECT MAX(similarity(v, p_name))
        FROM unnest(p.name_variants) AS v
      ), 0.0)
    )::FLOAT                                                    AS trgm_score,

    -- 2. Double Metaphone: phonetic key equality
    (
      dmetaphone(p.name_romanized) = dmetaphone(p_name)
      OR dmetaphone_alt(p.name_romanized) = dmetaphone(p_name)
      OR dmetaphone(p.name_romanized) = dmetaphone_alt(p_name)
    )                                                           AS metaphone_match,

    -- 3. Levenshtein on first token (given name)
    levenshtein(
      lower(split_part(p.name_romanized, ' ', 1)),
      lower(split_part(p_name, ' ', 1))
    )                                                           AS levenshtein_dist,

    -- 4. Mobile exact match
    (p_mobile IS NOT NULL AND p.contact_number = p_mobile)      AS mobile_exact_match,

    -- 5. Age delta (null-safe, using text age column)
    CASE
      WHEN p_age IS NULL THEN 0
      WHEN p.age IS NULL OR p.age = '' THEN 99
      ELSE ABS(p.age::INT - p_age)
    END                                                         AS age_delta,

    -- 6. Composite score (inline for ORDER BY)
    (
      GREATEST(
        similarity(p.name_romanized, p_name),
        COALESCE((
          SELECT MAX(similarity(v, p_name))
          FROM unnest(p.name_variants) AS v
        ), 0.0)
      ) * 0.45
      + CASE WHEN (
          dmetaphone(p.name_romanized) = dmetaphone(p_name)
          OR dmetaphone_alt(p.name_romanized) = dmetaphone(p_name)
        ) THEN 0.30 ELSE 0.0 END
      + CASE WHEN levenshtein(
            lower(split_part(p.name_romanized, ' ', 1)),
            lower(split_part(p_name, ' ', 1))
          ) <= 2 THEN 0.15 ELSE 0.0 END
      + CASE WHEN p_age IS NOT NULL AND p.age IS NOT NULL AND p.age != '' AND
            ABS(p.age::INT - p_age) <= 3 THEN 0.10 ELSE 0.0 END
    )::FLOAT                                                    AS composite_score

  FROM patients p
  WHERE
    p.name_romanized IS NOT NULL
    AND p.name_romanized != ''
    AND (
      similarity(p.name_romanized, p_name) > trgm_threshold
      OR dmetaphone(p.name_romanized) = dmetaphone(p_name)
      OR dmetaphone_alt(p.name_romanized) = dmetaphone(p_name)
      OR (p_mobile IS NOT NULL AND p.contact_number = p_mobile)
      OR EXISTS (
        SELECT 1 FROM unnest(p.name_variants) v
        WHERE similarity(v, p_name) > trgm_threshold
      )
    )
  ORDER BY
    -- Mobile override: float to top unconditionally
    CASE WHEN p_mobile IS NOT NULL AND p.contact_number = p_mobile THEN 1 ELSE 0 END DESC,
    composite_score DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;
