-- Allow service role to read profiles for auth
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for NextAuth signIn callback)
CREATE POLICY "service_role_all_access"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read their own profile
CREATE POLICY "users_read_own_profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (email = current_setting('request.jwt.claims', true)::json->>'email');
