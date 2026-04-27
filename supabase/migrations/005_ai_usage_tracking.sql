-- AI Usage Tracking Table
-- Tracks OpenRouter API usage for cost monitoring and analytics

CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Request details
  endpoint TEXT NOT NULL, -- 'match', 'batch_match', 'normalize'
  model_used TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  prompt_version TEXT DEFAULT 'v1',
  
  -- Usage metrics
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd NUMERIC(10, 6),
  
  -- Request context
  session_id TEXT,
  user_email TEXT,
  screening_date DATE,
  screening_state TEXT,
  screening_district TEXT,
  facility_name TEXT,
  
  -- Performance metrics
  request_duration_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  
  -- Batch details
  batch_size INTEGER, -- Number of items in batch request
  items_processed INTEGER -- Number of items successfully processed
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_email ON ai_usage(user_email);
CREATE INDEX IF NOT EXISTS idx_ai_usage_endpoint ON ai_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model_used ON ai_usage(model_used);
CREATE INDEX IF NOT EXISTS idx_ai_usage_screening_date ON ai_usage(screening_date);

-- Row Level Security
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own AI usage" ON ai_usage;
DROP POLICY IF EXISTS "Service role can insert AI usage" ON ai_usage;
DROP POLICY IF EXISTS "Admins can read all AI usage" ON ai_usage;

-- Policy: Users can read their own usage
CREATE POLICY "Users can read own AI usage"
  ON ai_usage FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Policy: Service role can insert usage
CREATE POLICY "Service role can insert AI usage"
  ON ai_usage FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Admins can read all usage
CREATE POLICY "Admins can read all AI usage"
  ON ai_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'PM', 'SPM')
    )
  );

-- Function to calculate estimated cost based on model
CREATE OR REPLACE FUNCTION calculate_ai_cost(
  p_model TEXT,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER
) RETURNS NUMERIC AS $$
BEGIN
  -- gpt-4o-mini pricing (as of 2024)
  -- Input: $0.15 / 1M tokens
  -- Output: $0.60 / 1M tokens
  IF p_model = 'gpt-4o-mini' THEN
    RETURN (p_input_tokens * 0.15 / 1000000.0) + (p_output_tokens * 0.60 / 1000000.0);
  END IF;
  
  -- gpt-4o pricing (as of 2024)
  -- Input: $2.50 / 1M tokens
  -- Output: $10.00 / 1M tokens
  IF p_model = 'gpt-4o' THEN
    RETURN (p_input_tokens * 2.50 / 1000000.0) + (p_output_tokens * 10.00 / 1000000.0);
  END IF;
  
  RETURN 0;
END;
$$ LANGUAGE plpgsql;
