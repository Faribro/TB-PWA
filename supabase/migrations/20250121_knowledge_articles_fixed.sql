-- ═══════════════════════════════════════════════════════════════
-- QUERY 1: TABLE + TRIGGER
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS knowledge_articles (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text        NOT NULL,
  slug          text        UNIQUE NOT NULL,
  content       text        NOT NULL,
  excerpt       text,
  article_type  text        NOT NULL
                CHECK (article_type IN ('manual', 'guide', 'announcement')),
  visible_to    text        NOT NULL DEFAULT 'all'
                CHECK (visible_to IN ('all', 'PC', 'SPM', 'ME', 'PM')),
  created_by_role text      NOT NULL,
  created_by_name text      NOT NULL,
  is_published  boolean     NOT NULL DEFAULT true,
  is_pinned     boolean     NOT NULL DEFAULT false,
  display_order integer     NOT NULL DEFAULT 999,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_knowledge_updated_at ON knowledge_articles;
CREATE TRIGGER trg_knowledge_updated_at
  BEFORE UPDATE ON knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- QUERY 2: RLS POLICIES (DROP FIRST, THEN CREATE)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE knowledge_articles DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated_read" ON knowledge_articles;
DROP POLICY IF EXISTS "pm_admin_full_access" ON knowledge_articles;
DROP POLICY IF EXISTS "spm_own_guides" ON knowledge_articles;

ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated_read"
  ON knowledge_articles FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE POLICY "pm_admin_full_access"
  ON knowledge_articles FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('PM', 'admin'));

CREATE POLICY "spm_own_guides"
  ON knowledge_articles FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'SPM'
    AND created_by_name = auth.jwt() ->> 'staffName'
    AND article_type = 'guide'
  );

-- ═══════════════════════════════════════════════════════════════
-- QUERY 3: SEED DATA
-- ═══════════════════════════════════════════════════════════════

INSERT INTO knowledge_articles
  (title, slug, content, excerpt, article_type, visible_to,
   created_by_role, created_by_name, is_published, is_pinned, display_order)
VALUES
('System Overview','system-overview',
 E'## What is SAMADHAAN?\n\nSAMADHAAN is a mission-critical health surveillance platform for TB patient tracking in correctional facilities. It integrates real-time data from KoboToolbox, Google Sheets, and Supabase.\n\n## Key Capabilities\n\n- Neural network visualization of patient flow via Vertex\n- Geographic intelligence mapping with GIS module\n- Automated SLA breach detection and triage pipeline\n- Role-based access control across 5 user types\n- Offline-first PC screening form with auto-sync\n\n## Data Flow\n\nKoboToolbox forms → Webhook → Supabase → Dashboard → Reports',
 'Complete overview of the SAMADHAAN National Health OS architecture, capabilities, and data pipeline.',
 'manual','ME','admin','System Admin',true,true,1),
('Architecture & Workflow','architecture-workflow',
 E'## System Architecture\n\nSAMADHAAN uses a three-tier architecture:\n\n1. **Data Collection** — KoboToolbox forms (PC field workers) + CSV bulk uploads\n2. **Processing** — Next.js API routes + Supabase as the single source of truth\n3. **Visualization** — Role-filtered dashboards per user type\n\n## User Roles & Access\n\n- **PM / Admin** — National access, full CRUD, admin panel, impersonation\n- **SPM** — State-level access, bulk operations, no admin panel\n- **ME** — State-level read + edit, no Command Hub\n- **PC** — Own submissions only, simplified 2-tab dashboard',
 'How SAMADHAAN is structured — data tiers, role hierarchy, and sync mechanisms.',
 'manual','ME','admin','System Admin',true,false,2),
('7-Step M&E Protocol','me-protocol',
 E'## Monthly M&E Cycle\n\nAll State M&E Officers must follow this protocol every month:\n\n1. **Data Verification** — Cross-check Supabase records against field submissions by the 3rd\n2. **Gap Analysis** — Identify missing districts or facilities with zero submissions\n3. **Follow-up Triage** — Prioritize high-alert cases in the Follow-up Pipeline\n4. **State Report Compilation** — Export data from Vertex and generate state summary\n5. **Indicator Calculation** — Compute treatment initiation rate, DOTS coverage, DR-TB rate\n6. **Review Meeting** — Present findings to SPM by the 8th of each month\n7. **Upload to National Dashboard** — Submit finalized metrics via admin panel by the 10th',
 'The 7-step monthly monitoring and evaluation protocol for M&E officers.',
 'manual','ME','admin','System Admin',true,true,3),
('Vertex Operations Guide','vertex-operations',
 E'## What is Vertex?\n\nVertex is the master patient table for PM, SPM, and ME roles.\n\n## Key Features\n\n- **Search & Filter** — Filter by state, district, facility, date range, TB status\n- **Patient Detail Panel** — Click any row to open the slide-over detail view\n- **Bulk Upload** — PM/SPM/admin can upload CSV or XLSX files\n- **Export** — Download filtered data as CSV\n\n## How to Use Bulk Upload\n\n1. Go to Vertex → click Bulk Upload button (top right)\n2. Drop your CSV or XLSX file\n3. Review the column mapping preview\n4. Click Upload — records upsert by serial_no\n5. Download error CSV if any rows failed',
 'How to use the Vertex patient data overview, including bulk upload and filtering.',
 'guide','all','admin','System Admin',true,false,4),
('PC Screening Form Guide','pc-screening-guide',
 E'## How to Submit a Patient Record\n\n### Online Submission\n\n1. Log in → sidebar shows My Work and Settings\n2. Click New Screening\n3. Fill all 5 steps: Patient Identity → Location → Symptoms → Referral → Treatment\n4. Click Submit Record\n\n### Offline Submission\n\n1. Fill the form as normal\n2. A "Saved locally" confirmation will appear\n3. The record auto-syncs when your device reconnects\n\n## 10-Symptom Checklist\n\nAlways screen all 10: Cough ≥2 weeks, Fever, Night sweats, Weight loss, Haemoptysis, Chest pain, Breathlessness, Lymphadenopathy, Loss of appetite, Other.',
 'Step-by-step guide for Program Coordinators to submit TB screening records.',
 'guide','PC','admin','System Admin',true,false,5),
('Security Protocols','security-protocols',
 E'## Session Security\n\nAll SAMADHAAN sessions expire after 8 hours. Users must re-authenticate after expiry.\n\n## Access Rules\n\n- Admin panel requires PM or admin role\n- PC users are redirected to /dashboard/my-submissions automatically\n- ME users cannot access Command Hub or admin panel\n\n## Data Security\n\n- All data encrypted in transit (HTTPS/TLS)\n- Supabase RLS enforces data scoping at database level\n- PC users can only query their own patient records\n- SPM/ME users can only query their assigned state',
 'Security protocols, session management, and data access rules.',
 'manual','ME','admin','System Admin',true,false,6),
('Data Integrity Standards','data-integrity',
 E'## Required Fields\n\nEvery patient record must have:\n- Serial number (unique per facility)\n- Patient name, age, and sex\n- Screening state and district\n- Facility name and type\n- Submission date\n- Staff name (auto-populated from session)\n\n## Duplicate Prevention\n\nRecords upsert using serial_no (bulk) and kobo_uuid (webhook) as conflict keys.\n\n## Data Correction\n\nOnly PM/admin/SPM can edit records via Vertex. PCs cannot edit submitted records.',
 'Standards for data quality, required fields, duplicate prevention, and correction procedures.',
 'manual','ME','admin','System Admin',true,false,7)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  article_type = EXCLUDED.article_type,
  visible_to = EXCLUDED.visible_to,
  is_published = EXCLUDED.is_published,
  is_pinned = EXCLUDED.is_pinned,
  display_order = EXCLUDED.display_order;

-- Verify: should return 7
SELECT COUNT(*) FROM knowledge_articles;
