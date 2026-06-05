-- ═══════════════════════════════════════════════════════════════════════════
-- PERFORMANCE INDEXES FOR PATIENT BOARD QUERIES & DATA SYNCING
-- ═══════════════════════════════════════════════════════════════════════════

-- High-Performance Composite Index for Patient Board Queries
CREATE INDEX IF NOT EXISTS idx_patients_clinical_pipeline 
ON public.patients (tb_diagnosed, current_phase, screening_state, created_at DESC);

-- Index covering explicit identification lookups to accelerate data syncing
CREATE INDEX IF NOT EXISTS idx_patients_kobo_uuid 
ON public.patients (kobo_uuid) WHERE kobo_uuid IS NOT NULL;
