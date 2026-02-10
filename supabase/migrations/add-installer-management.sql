-- =====================================================
-- MIGRATION: Installer Management, Customer Portal & Self-Booking
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. USER PROFILES EXTENSIONS
-- =====================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS installer_type TEXT CHECK (installer_type IN ('employee', 'subcontractor')),
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hardplast_expiry DATE,
  ADD COLUMN IF NOT EXISTS priority_order INTEGER DEFAULT 99,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- =====================================================
-- 2. INSTALLER BLOCKED DATES
-- =====================================================

CREATE TABLE IF NOT EXISTS installer_blocked_dates (
  id SERIAL PRIMARY KEY,
  installer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  slot TEXT NOT NULL DEFAULT 'full' CHECK (slot IN ('full', 'morning', 'afternoon')),
  reason TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(installer_id, blocked_date, slot)
);

CREATE INDEX IF NOT EXISTS idx_blocked_dates_installer ON installer_blocked_dates(installer_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON installer_blocked_dates(blocked_date);

-- =====================================================
-- 3. BOOKING INSTALLERS (junction table)
-- =====================================================

CREATE TABLE IF NOT EXISTS booking_installers (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  installer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_lead BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id, installer_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_installers_booking ON booking_installers(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_installers_installer ON booking_installers(installer_id);
CREATE INDEX IF NOT EXISTS idx_booking_installers_status ON booking_installers(status);

-- =====================================================
-- 4. BOOKING CONFIRMATION REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS booking_confirmation_requests (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  installer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'discord', 'in_app')),
  token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_confirmation_requests_booking ON booking_confirmation_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_requests_installer ON booking_confirmation_requests(installer_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_requests_token ON booking_confirmation_requests(token);
CREATE INDEX IF NOT EXISTS idx_confirmation_requests_status ON booking_confirmation_requests(status);

-- =====================================================
-- 5. INSTALLER CONTRACTS
-- =====================================================

CREATE TABLE IF NOT EXISTS installer_contracts (
  id SERIAL PRIMARY KEY,
  installer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('employee', 'subcontractor')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'expired')),
  draft_pdf_path TEXT,
  signed_pdf_path TEXT,
  valid_from DATE,
  valid_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_installer ON installer_contracts(installer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON installer_contracts(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_installer_contracts_updated_at ON installer_contracts;
CREATE TRIGGER update_installer_contracts_updated_at
  BEFORE UPDATE ON installer_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. BOOKINGS EXTENSIONS
-- =====================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS num_installers INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS slot_type TEXT DEFAULT 'full' CHECK (slot_type IN ('full', 'morning', 'afternoon')),
  ADD COLUMN IF NOT EXISTS customer_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS customer_booked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_token ON bookings(customer_token);

-- =====================================================
-- 7. QUOTE REQUESTS EXTENSIONS
-- =====================================================

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS num_installers INTEGER DEFAULT 2;

-- =====================================================
-- 8. COMPANY INFO EXTENSIONS
-- =====================================================

ALTER TABLE company_info
  ADD COLUMN IF NOT EXISTS reschedule_days_before INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS default_num_installers INTEGER DEFAULT 2;

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE installer_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_installers ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_confirmation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_contracts ENABLE ROW LEVEL SECURITY;

-- Installer blocked dates: Installers see own, admins see all
DROP POLICY IF EXISTS "Installers can view own blocked dates" ON installer_blocked_dates;
CREATE POLICY "Installers can view own blocked dates" ON installer_blocked_dates
  FOR SELECT USING (installer_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Installers can manage own blocked dates" ON installer_blocked_dates;
CREATE POLICY "Installers can manage own blocked dates" ON installer_blocked_dates
  FOR INSERT WITH CHECK (installer_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Installers can delete own blocked dates" ON installer_blocked_dates;
CREATE POLICY "Installers can delete own blocked dates" ON installer_blocked_dates
  FOR DELETE USING (installer_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Admins can manage all blocked dates" ON installer_blocked_dates;
CREATE POLICY "Admins can manage all blocked dates" ON installer_blocked_dates
  FOR ALL USING (is_admin());

-- Booking installers: Installers see own assignments, admins see all
DROP POLICY IF EXISTS "Installers can view own assignments" ON booking_installers;
CREATE POLICY "Installers can view own assignments" ON booking_installers
  FOR SELECT USING (installer_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Admins can manage assignments" ON booking_installers;
CREATE POLICY "Admins can manage assignments" ON booking_installers
  FOR ALL USING (is_admin());

-- Confirmation requests: Installers see own, admins see all
DROP POLICY IF EXISTS "Installers can view own confirmations" ON booking_confirmation_requests;
CREATE POLICY "Installers can view own confirmations" ON booking_confirmation_requests
  FOR SELECT USING (installer_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Installers can update own confirmations" ON booking_confirmation_requests;
CREATE POLICY "Installers can update own confirmations" ON booking_confirmation_requests
  FOR UPDATE USING (installer_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Admins can manage confirmations" ON booking_confirmation_requests;
CREATE POLICY "Admins can manage confirmations" ON booking_confirmation_requests
  FOR ALL USING (is_admin());

-- Contracts: Installers see own, admins see all
DROP POLICY IF EXISTS "Installers can view own contracts" ON installer_contracts;
CREATE POLICY "Installers can view own contracts" ON installer_contracts
  FOR SELECT USING (installer_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Admins can manage contracts" ON installer_contracts;
CREATE POLICY "Admins can manage contracts" ON installer_contracts
  FOR ALL USING (is_admin());

-- =====================================================
-- 10. ADD booking_confirmation TASK TYPE
-- (tasks table already exists, just add new type value)
-- =====================================================

-- Add order_confirmation message template
INSERT INTO message_templates (type, name, subject, body, is_default) VALUES
  ('order_confirmation', 'Orderbekräftelse', 'Tack för din beställning - Intellifoam',
   'Hej {{customer_name}},

Tack för att du valt Intellifoam! Vi har tagit emot din beställning.

Du kan följa din bokning och se detaljer via din kundportal:
{{portal_link}}

Vid inloggning anger du ditt efternamn.

Har du frågor? Kontakta oss på 010 703 74 00 eller info@intellifoam.se.

Med vänliga hälsningar,
Intellifoam', true),

  ('installer_confirmation', 'Bekräftelse till installatör', 'Ny bokning att bekräfta - Intellifoam',
   'Hej {{installer_name}},

Du har blivit tilldelad en ny installation:

Kund: {{customer_name}}
Adress: {{customer_address}}
Datum: {{installation_date}}
Tid: {{slot_type}}

Klicka här för att acceptera eller avböja:
{{confirm_link}}

Med vänliga hälsningar,
Intellifoam', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- DONE! Run this in Supabase SQL Editor
-- =====================================================
