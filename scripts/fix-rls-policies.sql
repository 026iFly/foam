-- Fix RLS policies for user_profiles table
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor)

-- Helper function to check if current user is admin (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT
  USING (is_admin());

-- Policy: Admins can insert new profiles
CREATE POLICY "Admins can insert profiles" ON user_profiles
  FOR INSERT
  WITH CHECK (is_admin());

-- Policy: Admins can update any profile
CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE
  USING (is_admin());

-- Policy: Admins can delete profiles (except themselves)
CREATE POLICY "Admins can delete profiles" ON user_profiles
  FOR DELETE
  USING (is_admin() AND id != auth.uid());
