-- AI Feedback Table
-- Stores user corrections to AI matching decisions for learning

CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Match context
  extracted_name TEXT NOT NULL,
  extracted_father_name TEXT,
  extracted_age INTEGER,
  extracted_mobile TEXT,
  extracted_facility TEXT,
  
  candidate_name TEXT NOT NULL,
  candidate_age INTEGER,
  candidate_mobile TEXT,
  candidate_facility TEXT,
  
  -- AI decision
  ai_decision TEXT NOT NULL, -- 'match' or 'no_match'
  ai_confidence NUMERIC NOT NULL,
  ai_reasons JSONB,
  
  -- User correction
  user_action TEXT NOT NULL, -- 'accept', 'reject', 'create'
  was_correct BOOLEAN NOT NULL, -- Did user agree with AI?
  
  -- Session context
  session_id TEXT,
  user_email TEXT,
  screening_date DATE,
  screening_state TEXT,
  screening_district TEXT,
  facility_name TEXT,
  
  -- Metadata
  model_used TEXT DEFAULT 'gpt-4o-mini',
  prompt_version TEXT DEFAULT 'v1'
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON ai_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_email ON ai_feedback(user_email);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_was_correct ON ai_feedback(was_correct);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_screening_date ON ai_feedback(screening_date);

-- Row Level Security
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own AI feedback" ON ai_feedback;
DROP POLICY IF EXISTS "Service role can insert AI feedback" ON ai_feedback;
DROP POLICY IF EXISTS "Admins can read all AI feedback" ON ai_feedback;

-- Policy: Users can read their own feedback
CREATE POLICY "Users can read own AI feedback"
  ON ai_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Policy: Service role can insert feedback
CREATE POLICY "Service role can insert AI feedback"
  ON ai_feedback FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Admins can read all feedback
CREATE POLICY "Admins can read all AI feedback"
  ON ai_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'PM', 'SPM')
    )
  );
