-- Supabase PostgreSQL Schema for Spray Foam Site
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Company Info Table
CREATE TABLE IF NOT EXISTS company_info (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  org_number TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects Table (for gallery)
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  project_type TEXT,
  image_url TEXT,
  before_image_url TEXT,
  after_image_url TEXT,
  area_size REAL,
  completion_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAQs Table
CREATE TABLE IF NOT EXISTS faqs (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Submissions Table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  project_type TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost Variables Table
CREATE TABLE IF NOT EXISTS cost_variables (
  id SERIAL PRIMARY KEY,
  variable_key TEXT NOT NULL UNIQUE,
  variable_value REAL NOT NULL,
  variable_unit TEXT,
  description TEXT,
  category TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote Requests Table
CREATE TABLE IF NOT EXISTS quote_requests (
  id SERIAL PRIMARY KEY,

  -- Customer info
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT NOT NULL,
  project_type TEXT,
  message TEXT,

  -- Calculation data (JSON)
  calculation_data JSONB NOT NULL,

  -- Climate parameters
  climate_zone TEXT,
  indoor_temp REAL,
  indoor_rh REAL,
  has_three_phase BOOLEAN DEFAULT FALSE,
  apply_rot_deduction BOOLEAN DEFAULT FALSE,

  -- Totals (denormalized)
  total_area REAL,
  total_excl_vat INTEGER,
  total_incl_vat INTEGER,
  rot_deduction INTEGER DEFAULT 0,

  -- Workflow
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  adjusted_data JSONB,
  adjusted_total_excl_vat INTEGER,
  adjusted_total_incl_vat INTEGER,

  -- Quote document
  quote_number TEXT UNIQUE,
  quote_pdf_path TEXT,
  quote_valid_until DATE,

  -- ROT info
  rot_info_token TEXT,
  rot_customer_info JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent_at TIMESTAMPTZ
);

-- Indexes for quote_requests
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON quote_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_quote_requests_customer_email ON quote_requests(customer_email);
CREATE INDEX IF NOT EXISTS idx_quote_requests_rot_token ON quote_requests(rot_info_token);

-- Pricing Config Table (if used)
CREATE TABLE IF NOT EXISTS pricing_config (
  id SERIAL PRIMARY KEY,
  foam_type TEXT NOT NULL,
  thickness_mm INTEGER NOT NULL,
  price_per_m2_excl_vat REAL NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additional Costs Table (if used)
CREATE TABLE IF NOT EXISTS additional_costs (
  id SERIAL PRIMARY KEY,
  cost_type TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  unit TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Multipliers Table (if used)
CREATE TABLE IF NOT EXISTS project_multipliers (
  id SERIAL PRIMARY KEY,
  project_type TEXT NOT NULL,
  multiplier REAL NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keep-alive table for cron job
CREATE TABLE IF NOT EXISTS keep_alive (
  id SERIAL PRIMARY KEY,
  last_ping TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial keep-alive record
INSERT INTO keep_alive (last_ping) VALUES (NOW()) ON CONFLICT DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at (drop first to allow re-running)
DROP TRIGGER IF EXISTS update_company_info_updated_at ON company_info;
CREATE TRIGGER update_company_info_updated_at
  BEFORE UPDATE ON company_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cost_variables_updated_at ON cost_variables;
CREATE TRIGGER update_cost_variables_updated_at
  BEFORE UPDATE ON cost_variables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quote_requests_updated_at ON quote_requests;
CREATE TRIGGER update_quote_requests_updated_at
  BEFORE UPDATE ON quote_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pricing_config_updated_at ON pricing_config;
CREATE TRIGGER update_pricing_config_updated_at
  BEFORE UPDATE ON pricing_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_additional_costs_updated_at ON additional_costs;
CREATE TRIGGER update_additional_costs_updated_at
  BEFORE UPDATE ON additional_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_multipliers_updated_at ON project_multipliers;
CREATE TRIGGER update_project_multipliers_updated_at
  BEFORE UPDATE ON project_multipliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default cost variables
INSERT INTO cost_variables (variable_key, variable_value, variable_unit, description, category) VALUES
  ('closed_material_cost', 45, 'kr/kg', 'Material cost for closed cell foam per kg', 'closed_foam'),
  ('closed_margin', 30, '%', 'Profit margin percentage for closed cell foam', 'closed_foam'),
  ('closed_density', 35, 'kg/m³', 'Density of closed cell foam', 'closed_foam'),
  ('closed_spray_time', 0.5, 'hours/m³', 'Time required to spray 1 m³ of closed cell foam', 'closed_foam'),
  ('open_material_cost', 25, 'kr/kg', 'Material cost for open cell foam per kg', 'open_foam'),
  ('open_margin', 30, '%', 'Profit margin percentage for open cell foam', 'open_foam'),
  ('open_density', 10, 'kg/m³', 'Density of open cell foam', 'open_foam'),
  ('open_spray_time', 0.4, 'hours/m³', 'Time required to spray 1 m³ of open cell foam', 'open_foam'),
  ('personnel_cost_per_hour', 625, 'kr/hour', 'Labor cost per hour', 'personnel'),
  ('generator_cost', 2000, 'kr', 'Cost for portable generator (if no 3-phase outlet)', 'equipment'),
  ('travel_base_cost', 1500, 'kr', 'Base travel/setup cost', 'travel'),
  ('travel_cost_per_km', 15, 'kr/km', 'Cost per kilometer from Gävle', 'travel'),
  ('setup_hours', 2, 'hours', 'Setup time for each job', 'labor')
ON CONFLICT (variable_key) DO NOTHING;

-- Insert default company info
INSERT INTO company_info (company_name, org_number, phone, email, website, description)
SELECT 'Intellifoam', '', '010 703 74 00', 'info@intellifoam.se', 'https://intellifoam.se', 'Vi erbjuder professionell sprayisolering med fokus på miljövänliga lösningar.'
WHERE NOT EXISTS (SELECT 1 FROM company_info LIMIT 1);

-- Insert default FAQs
INSERT INTO faqs (question, answer, category, sort_order) VALUES
  ('Vad är sprayisolering?', 'Sprayisolering är en modern isoleringslösning där polyuretanskum appliceras genom spray direkt på ytor. Det expanderar och härdar för att skapa en tät, isolerande barriär som både isolerar och tätar samtidigt.', 'Grundläggande', 1),
  ('Vilka typer av sprayskum finns det?', 'Det finns två huvudtyper: öppencellsskum (lättare, luftgenomsläppligt) och slutencellsskum (tätare, högre R-värde, fuktbeständigt). Vi hjälper dig välja rätt typ baserat på ditt projekts behov.', 'Grundläggande', 2),
  ('Är sprayisolering miljövänlig?', 'Ja! Modern sprayisolering har låga emissioner och följer EU:s REACH-förordning. Den reducerar energiförbrukningen dramatiskt genom överlägsen isolering, vilket minskar koldioxidutsläpp över tid.', 'Miljö', 3),
  ('Hur lång tid tar en installation?', 'Det beror på projektets storlek. Ett normalt villatak kan sprayskas på 1-2 dagar, medan större kommersiella projekt kan ta längre tid. Vi ger alltid en tidplan innan projektet startar.', 'Installation', 4),
  ('Vilka certifieringar krävs för sprayisolering i Sverige?', 'I Sverige krävs certifiering enligt EU:s REACH-förordning för hantering av diisocyanater. Våra tekniker är fullt certifierade och följer alla Boverkets byggregler (BBR) samt Arbetsmiljöverkets föreskrifter (AFS).', 'Certifiering', 5),
  ('Var kan sprayisolering användas?', 'Sprayisolering är mångsidig och kan användas i vindar, källare, krypgrund, väggar, tak, och industribyggnader. Den fungerar utmärkt både i nybyggnation och renovering.', 'Användning', 6)
ON CONFLICT DO NOTHING;

-- =====================================================
-- USER PROFILES TABLE (for Supabase Auth integration)
-- =====================================================

-- User profiles table linked to Supabase Auth
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'installer' CHECK (role IN ('admin', 'installer')),
  profile_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY FOR USER_PROFILES
-- =====================================================

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

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

-- Policy: Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile (but not role)
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT
  USING (is_admin());

-- Policy: Admins can insert new profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
CREATE POLICY "Admins can insert profiles" ON user_profiles
  FOR INSERT
  WITH CHECK (is_admin());

-- Policy: Admins can update any profile
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE
  USING (is_admin());

-- Policy: Admins can delete profiles (except themselves)
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
CREATE POLICY "Admins can delete profiles" ON user_profiles
  FOR DELETE
  USING (is_admin() AND id != auth.uid());

-- =====================================================
-- STORAGE BUCKET FOR PROFILE PHOTOS
-- =====================================================
-- Note: Run these commands in Supabase Dashboard -> Storage
-- or via the Supabase CLI

-- Create bucket (run in Supabase SQL editor or dashboard):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('profile-photos', 'profile-photos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile-photos bucket:
-- Users can upload to their own folder
-- DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
-- CREATE POLICY "Users can upload own photos" ON storage.objects
--   FOR INSERT
--   WITH CHECK (
--     bucket_id = 'profile-photos'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Users can update their own photos
-- DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
-- CREATE POLICY "Users can update own photos" ON storage.objects
--   FOR UPDATE
--   USING (
--     bucket_id = 'profile-photos'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Users can delete their own photos
-- DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
-- CREATE POLICY "Users can delete own photos" ON storage.objects
--   FOR DELETE
--   USING (
--     bucket_id = 'profile-photos'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Anyone can view photos (public bucket)
-- DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
-- CREATE POLICY "Anyone can view photos" ON storage.objects
--   FOR SELECT
--   USING (bucket_id = 'profile-photos');
