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
-- DISABLE first so seed data inserts work regardless
ALTER TABLE knowledge_articles DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "allow_all_authenticated_read" ON knowledge_articles;
DROP POLICY IF EXISTS "pm_admin_full_access" ON knowledge_articles;
DROP POLICY IF EXISTS "spm_own_guides" ON knowledge_articles;

-- Re-enable RLS
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated users see published articles
CREATE POLICY "allow_all_authenticated_read"
  ON knowledge_articles FOR SELECT
  TO authenticated
  USING (is_published = true);

-- PM/admin: full CRUD
CREATE POLICY "pm_admin_full_access"
  ON knowledge_articles FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('PM', 'admin'));

-- SPM: can only CRUD their own guides
CREATE POLICY "spm_own_guides"
  ON knowledge_articles FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'SPM'
    AND created_by_name = auth.jwt() ->> 'staffName'
    AND article_type = 'guide'
  );
