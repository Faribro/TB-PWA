-- Add indexes for auth performance
CREATE INDEX IF NOT EXISTS idx_profiles_email_active ON profiles(email, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add comment
COMMENT ON INDEX idx_profiles_email_active IS 'Optimizes auth login queries by email and active status';
