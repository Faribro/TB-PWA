-- ─── TABLE ───────────────────────────────────────────────────
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

-- ─── AUTO-UPDATE updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_knowledge_updated_at ON knowledge_articles;
CREATE TRIGGER trg_knowledge_updated_at
  BEFORE UPDATE ON knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────
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

-- ─── SEED DATA ───────────────────────────────────────────────
INSERT INTO knowledge_articles
  (title, slug, content, excerpt, article_type, visible_to,
   created_by_role, created_by_name, is_published, is_pinned, display_order)
VALUES
(
  'System Overview',
  'system-overview',
  '## What is SAMADHAAN?

SAMADHAAN is a mission-critical health surveillance platform designed for TB patient tracking in correctional facilities. It integrates real-time data from KoboToolbox, Google Sheets, and Supabase.

## Key Capabilities

- Neural network visualization of patient flow via Vertex
- Geographic intelligence mapping with GIS module
- Automated SLA breach detection and triage pipeline
- Role-based access control across 5 user types
- Offline-first PC screening form with auto-sync

## Data Flow

KoboToolbox forms → Webhook → Supabase → Dashboard → Reports

Bulk CSV/XLSX uploads are also supported for historical data import.',
  'Complete overview of the SAMADHAAN National Health OS architecture, capabilities, and data pipeline.',
  'manual', 'ME', 'admin', 'System Admin', true, true, 1
),
(
  'Architecture & Workflow',
  'architecture-workflow',
  '## System Architecture

SAMADHAAN uses a three-tier architecture:

1. **Data Collection** — KoboToolbox forms (PC field workers) + CSV bulk uploads
2. **Processing** — Next.js API routes + Supabase as the single source of truth
3. **Visualization** — Role-filtered dashboards per user type

## User Roles & Access

- **PM / Admin** — National access, full CRUD, admin panel, impersonation
- **SPM** — State-level access, bulk operations, no admin panel
- **ME** — State-level read + edit, no Command Hub
- **PC** — Own submissions only, simplified 2-tab dashboard

## Data Sync

KoboToolbox webhook fires on every form submission. The `/api/webhook/kobo` endpoint transforms the payload and upserts to the `patients` table using `kobo_uuid` as the conflict key.',
  'How SAMADHAAN is structured — data tiers, role hierarchy, and sync mechanisms.',
  'manual', 'ME', 'admin', 'System Admin', true, false, 2
),
(
  '7-Step M&E Protocol',
  'me-protocol',
  '## Monthly M&E Cycle

All State M&E Officers must follow this protocol every month:

1. **Data Verification** — Cross-check Supabase records against field submissions by the 3rd
2. **Gap Analysis** — Identify missing districts or facilities with zero submissions
3. **Follow-up Triage** — Prioritize high-alert cases in the Follow-up Pipeline
4. **State Report Compilation** — Export data from Vertex and generate state summary
5. **Indicator Calculation** — Compute treatment initiation rate, DOTS coverage, DR-TB rate
6. **Review Meeting** — Present findings to SPM by the 8th of each month
7. **Upload to National Dashboard** — Submit finalized metrics via admin panel by the 10th

## Required Metrics

- Total patients screened (monthly + cumulative)
- TB positivity rate
- Treatment initiation rate (target: 95%)
- DOTS coverage
- Drug-resistant TB cases',
  'The 7-step monthly monitoring and evaluation protocol for M&E officers.',
  'manual', 'ME', 'admin', 'System Admin', true, true, 3
),
(
  'Vertex Operations Guide',
  'vertex-operations',
  '## What is Vertex?

Vertex is the neural data overview — the master patient table for PM, SPM, and ME roles.

## Key Features

- **Search & Filter** — Filter by state, district, facility, date range, TB status
- **Patient Detail Panel** — Click any row to open the slide-over detail view
- **Bulk Upload** — PM/SPM/admin can upload CSV or XLSX files
- **Export** — Download filtered data as CSV

## How to Use Bulk Upload

1. Go to Vertex → click Bulk Upload button (top right)
2. Drop your CSV or XLSX file
3. Review the column mapping preview
4. Click Upload — records upsert by serial_no
5. Download error CSV if any rows failed

## Column Name Formats

The system accepts multiple header formats. Examples:
- `Serial No`, `serial_no`, `SERIAL_NO` all map to `serial_no`
- `Patient Name`, `patient_name` map to `patient_name`',
  'How to use the Vertex patient data overview, including bulk upload and filtering.',
  'guide', 'all', 'admin', 'System Admin', true, false, 4
),
(
  'PC Screening Form Guide',
  'pc-screening-guide',
  '## How to Submit a Patient Record

### Online Submission

1. Log in to SAMADHAAN → Your sidebar shows **My Work** and **Settings**
2. Click **New Screening** (or the + button)
3. Fill all 5 steps: Patient Identity → Location → Symptoms → Referral → Treatment
4. Click **Submit Record** — it saves immediately

### Offline Submission

You can screen patients even without internet:

1. Fill the form as normal
2. A **"Saved locally"** confirmation will appear instead of the usual success screen
3. The record auto-syncs when your device reconnects
4. A yellow "X unsynced · Sync now" badge appears in the header

## 10-Symptom Checklist

Always screen all 10 symptoms: Cough ≥2 weeks, Fever, Night sweats, Weight loss, Haemoptysis, Chest pain, Breathlessness, Lymphadenopathy, Loss of appetite, Other.

**Referral rule**: 2 or more symptoms → mandatory referral within 48 hours.',
  'Step-by-step guide for Program Coordinators to submit TB screening records, including offline mode.',
  'guide', 'PC', 'admin', 'System Admin', true, false, 5
),
(
  'Security Protocols',
  'security-protocols',
  '## Session Security

All SAMADHAAN sessions expire after 8 hours (28,800 seconds). Users must re-authenticate after expiry.

## Access Rules

- Admin panel (`/admin/*`) requires PM or admin role
- PC users are redirected to `/dashboard/my-submissions` automatically
- ME users cannot access Command Hub or admin panel

## Data Security

- All data is encrypted in transit (HTTPS/TLS)
- Supabase Row Level Security (RLS) enforces data scoping at the database level
- PC users can only query their own patient records (`staff_name` filter)
- SPM/ME users can only query their assigned state

## Incident Response

If you suspect unauthorized access:
1. Immediately contact the PM or admin
2. Do not delete any records
3. Screenshot any suspicious activity
4. Admin can revoke sessions via the admin panel',
  'Security protocols, session management, and data access rules for SAMADHAAN.',
  'manual', 'ME', 'admin', 'System Admin', true, false, 6
),
(
  'Data Integrity Standards',
  'data-integrity',
  '## Required Fields

Every patient record must have:
- Serial number (unique per facility)
- Patient name
- Age and sex
- Screening state and district
- Facility name and type
- Submission date
- Staff name (auto-populated from session)

## Duplicate Prevention

Records are upserted using `serial_no` as the conflict key for bulk uploads, and `kobo_uuid` for KoboToolbox webhook submissions. This prevents exact duplicates.

## Data Correction

Only PM/admin/SPM roles can edit existing records via the Vertex patient detail panel. PCs cannot edit submitted records — contact your SPM for corrections.

## Audit Trail

All records include `created_at` and `updated_at` timestamps. The `staff_name` field is auto-populated from the user session and cannot be manually overridden by PC users.',
  'Standards for data quality, required fields, duplicate prevention, and correction procedures.',
  'manual', 'ME', 'admin', 'System Admin', true, false, 7
)
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
