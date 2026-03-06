-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/wwcgybgvfulotflitogu/sql/new

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PM', 'SPM', 'M&E', 'PC')),
  state TEXT,
  district TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to read all profiles
CREATE POLICY "Allow service role to read profiles" ON public.profiles
FOR SELECT USING (true);

-- Add your email as authorized user
INSERT INTO public.profiles (email, role, state, district, is_active)
VALUES ('faridsayyed1010@gmail.com', 'M&E', 'Maharashtra', 'Mumbai', true)
ON CONFLICT (email) DO UPDATE SET
  is_active = true,
  role = EXCLUDED.role,
  state = EXCLUDED.state,
  district = EXCLUDED.district;

-- Verify the user was added
SELECT * FROM public.profiles WHERE email = 'faridsayyed1010@gmail.com';