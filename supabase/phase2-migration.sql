-- =====================================================
-- PHASE 2 MIGRATION: CRM & Inventory System
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. TERMS AND CONDITIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS terms_conditions (
  id SERIAL PRIMARY KEY,
  order_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_terms_conditions_updated_at ON terms_conditions;
CREATE TRIGGER update_terms_conditions_updated_at
  BEFORE UPDATE ON terms_conditions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default terms (Swedish)
INSERT INTO terms_conditions (order_index, text) VALUES
  (1, 'Offerten är giltig i 30 dagar från offertdatum.'),
  (2, 'Priserna är angivna exklusive moms om inget annat anges.'),
  (3, 'Betalning sker mot faktura med 30 dagars betalningsvillkor.'),
  (4, 'ROT-avdrag görs direkt på fakturan om kunden har fyllt i ROT-underlag.'),
  (5, 'Kunden ansvarar för att området är tillgängligt och förberett enligt instruktioner.'),
  (6, 'Arbetet utförs enligt gällande byggnormer och Boverkets byggregler (BBR).'),
  (7, 'Garanti på utfört arbete: 5 år. Materialgaranti enligt tillverkarens villkor.'),
  (8, 'Vid avbokning inom 48 timmar före bokad tid debiteras 50% av offertbeloppet.')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. MESSAGE TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS message_templates (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_message_templates_updated_at ON message_templates;
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates (Swedish)
INSERT INTO message_templates (type, name, subject, body, is_default) VALUES
  ('offer', 'Standard offert', 'Offert från Intellifoam - {{offer_number}}',
   'Hej {{customer_name}},

Tack för din förfrågan! Bifogat hittar du vår offert för sprutisoleringen.

Offerten är giltig till {{valid_until}}.

Klicka här för att se och godkänna offerten:
{{offer_link}}

Har du frågor? Kontakta oss på 010 703 74 00 eller info@intellifoam.se.

Med vänliga hälsningar,
Intellifoam', true),

  ('rot_link', 'ROT-underlag', 'Underlag för ROT-avdrag - Intellifoam',
   'Hej {{customer_name}},

För att vi ska kunna hjälpa dig med ROT-avdraget behöver vi lite uppgifter.

Klicka på länken nedan för att fylla i formuläret:
{{rot_link}}

Med vänliga hälsningar,
Intellifoam', true),

  ('follow_up', 'Påminnelse', 'Påminnelse: Din offert från Intellifoam',
   'Hej {{customer_name}},

Vi vill bara påminna om offerten vi skickade. Den är fortfarande giltig till {{valid_until}}.

Se offerten här:
{{offer_link}}

Hör av dig om du har frågor!

Med vänliga hälsningar,
Intellifoam', true),

  ('installation_confirmation', 'Bekräftelse installation', 'Bekräftelse av installation - Intellifoam',
   'Hej {{customer_name}},

Vi bekräftar härmed din bokade installation:

Datum: {{installation_date}}
Adress: {{customer_address}}

Vi kommer att kontakta dig dagen innan för att bekräfta tiden.

Med vänliga hälsningar,
Intellifoam', true),

  ('visit_confirmation', 'Bekräftelse hembesök', 'Bekräftelse av hembesök - Intellifoam',
   'Hej {{customer_name}},

Vi bekräftar härmed ditt bokade hembesök:

Datum: {{visit_date}}
Adress: {{customer_address}}

Vi ses då!

Med vänliga hälsningar,
Intellifoam', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. MATERIALS (Inventory)
-- =====================================================

CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sku VARCHAR(50),
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  current_stock DECIMAL(10,2) DEFAULT 0,
  minimum_stock DECIMAL(10,2) DEFAULT 0,
  unit_cost DECIMAL(10,2),
  supplier VARCHAR(100),
  lead_time_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;
CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default materials
INSERT INTO materials (name, sku, unit, current_stock, minimum_stock, unit_cost, supplier, lead_time_days) VALUES
  ('Sluten cellskum', 'CLOSED-CELL-01', 'kg', 0, 100, 45, '', 7),
  ('Öppen cellskum', 'OPEN-CELL-01', 'kg', 0, 100, 25, '', 7)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. STOCK TRANSACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS stock_transactions (
  id SERIAL PRIMARY KEY,
  material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL, -- 'delivery', 'installation', 'adjustment', 'reserved'
  reference_type VARCHAR(20), -- 'quote', 'shipment', 'booking', 'manual'
  reference_id INTEGER,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_stock_transactions_material ON stock_transactions(material_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_date ON stock_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_type ON stock_transactions(transaction_type);

-- =====================================================
-- 5. SHIPMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  supplier VARCHAR(100),
  order_number VARCHAR(50),
  expected_date DATE,
  received_date DATE,
  status VARCHAR(20) DEFAULT 'ordered', -- 'ordered', 'shipped', 'received', 'cancelled'
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_shipments_updated_at ON shipments;
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for status
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_expected_date ON shipments(expected_date);

-- =====================================================
-- 6. SHIPMENT ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS shipment_items (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id),
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment ON shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_material ON shipment_items(material_id);

-- =====================================================
-- 7. BOOKINGS (Visits & Installations)
-- =====================================================

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER REFERENCES quote_requests(id) ON DELETE SET NULL,
  booking_type VARCHAR(20) NOT NULL, -- 'visit', 'installation'
  scheduled_date DATE NOT NULL,
  scheduled_time VARCHAR(20), -- e.g., "08:00-12:00", "heldag"
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled'
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_quote ON bookings(quote_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- =====================================================
-- 8. BOOKING MATERIALS (Estimated material usage)
-- =====================================================

CREATE TABLE IF NOT EXISTS booking_materials (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id),
  estimated_quantity DECIMAL(10,2),
  actual_quantity DECIMAL(10,2)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_booking_materials_booking ON booking_materials(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_materials_material ON booking_materials(material_id);

-- =====================================================
-- 9. SYSTEM SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
  ('conversion_rates', '{"signed": 100, "sent": 50, "pending": 10}', 'Konverteringsgrad i procent per offert-status'),
  ('follow_up_days', '7', 'Antal dagar innan påminnelse skickas'),
  ('default_quote_validity_days', '30', 'Antal dagar offert är giltig')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 10. QUOTE REQUESTS UPDATES
-- Add new columns for offer signing and acceptance
-- =====================================================

-- Add columns for offer acceptance/signing
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS signed_name VARCHAR(200);
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS signed_ip VARCHAR(45);
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS offer_token VARCHAR(64);

-- Index for offer token lookups
CREATE INDEX IF NOT EXISTS idx_quote_requests_offer_token ON quote_requests(offer_token);

-- =====================================================
-- 11. UPDATE PROJECT MULTIPLIERS
-- Add labor_only flag to clarify they only affect time
-- =====================================================

ALTER TABLE project_multipliers ADD COLUMN IF NOT EXISTS labor_only BOOLEAN DEFAULT true;
ALTER TABLE project_multipliers ADD COLUMN IF NOT EXISTS name_sv VARCHAR(100);

-- Update existing multipliers with Swedish names
UPDATE project_multipliers SET labor_only = true WHERE labor_only IS NULL;

-- =====================================================
-- 12. VIEWS FOR DASHBOARD
-- =====================================================

-- View: Quote status counts
CREATE OR REPLACE VIEW quote_status_counts AS
SELECT
  status,
  COUNT(*) as count,
  SUM(COALESCE(adjusted_total_excl_vat, total_excl_vat, 0)) as total_value
FROM quote_requests
GROUP BY status;

-- View: Upcoming bookings with quote info
CREATE OR REPLACE VIEW upcoming_bookings AS
SELECT
  b.*,
  q.customer_name,
  q.customer_address,
  q.customer_phone,
  q.customer_email,
  COALESCE(q.adjusted_total_excl_vat, q.total_excl_vat) as quote_value
FROM bookings b
LEFT JOIN quote_requests q ON b.quote_id = q.id
WHERE b.scheduled_date >= CURRENT_DATE
  AND b.status NOT IN ('completed', 'cancelled')
ORDER BY b.scheduled_date ASC;

-- View: Stock levels with projections
CREATE OR REPLACE VIEW stock_levels AS
SELECT
  m.id,
  m.name,
  m.sku,
  m.unit,
  m.current_stock,
  m.minimum_stock,
  m.current_stock <= m.minimum_stock as is_low,
  COALESCE(
    (SELECT SUM(bm.estimated_quantity)
     FROM booking_materials bm
     JOIN bookings b ON bm.booking_id = b.id
     WHERE bm.material_id = m.id
       AND b.status NOT IN ('completed', 'cancelled')
       AND b.scheduled_date >= CURRENT_DATE
       AND b.scheduled_date < CURRENT_DATE + INTERVAL '7 days'),
    0
  ) as reserved_7_days,
  COALESCE(
    (SELECT SUM(bm.estimated_quantity)
     FROM booking_materials bm
     JOIN bookings b ON bm.booking_id = b.id
     WHERE bm.material_id = m.id
       AND b.status NOT IN ('completed', 'cancelled')
       AND b.scheduled_date >= CURRENT_DATE
       AND b.scheduled_date < CURRENT_DATE + INTERVAL '30 days'),
    0
  ) as reserved_30_days,
  COALESCE(
    (SELECT SUM(si.quantity)
     FROM shipment_items si
     JOIN shipments s ON si.shipment_id = s.id
     WHERE si.material_id = m.id
       AND s.status IN ('ordered', 'shipped')
       AND s.expected_date >= CURRENT_DATE
       AND s.expected_date < CURRENT_DATE + INTERVAL '7 days'),
    0
  ) as incoming_7_days,
  COALESCE(
    (SELECT SUM(si.quantity)
     FROM shipment_items si
     JOIN shipments s ON si.shipment_id = s.id
     WHERE si.material_id = m.id
       AND s.status IN ('ordered', 'shipped')
       AND s.expected_date >= CURRENT_DATE
       AND s.expected_date < CURRENT_DATE + INTERVAL '30 days'),
    0
  ) as incoming_30_days
FROM materials m;

-- =====================================================
-- 13. RLS POLICIES FOR NEW TABLES
-- (All admin-only for now)
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE terms_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if authenticated (any logged in user)
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Terms conditions: All authenticated users can read
DROP POLICY IF EXISTS "Authenticated users can read terms" ON terms_conditions;
CREATE POLICY "Authenticated users can read terms" ON terms_conditions
  FOR SELECT USING (is_authenticated());

DROP POLICY IF EXISTS "Admins can manage terms" ON terms_conditions;
CREATE POLICY "Admins can manage terms" ON terms_conditions
  FOR ALL USING (is_admin());

-- Message templates: All authenticated users can read
DROP POLICY IF EXISTS "Authenticated users can read templates" ON message_templates;
CREATE POLICY "Authenticated users can read templates" ON message_templates
  FOR SELECT USING (is_authenticated());

DROP POLICY IF EXISTS "Admins can manage templates" ON message_templates;
CREATE POLICY "Admins can manage templates" ON message_templates
  FOR ALL USING (is_admin());

-- Materials: All authenticated users can read and update
DROP POLICY IF EXISTS "Authenticated users can read materials" ON materials;
CREATE POLICY "Authenticated users can read materials" ON materials
  FOR SELECT USING (is_authenticated());

DROP POLICY IF EXISTS "Authenticated users can update materials" ON materials;
CREATE POLICY "Authenticated users can update materials" ON materials
  FOR UPDATE USING (is_authenticated());

DROP POLICY IF EXISTS "Admins can manage materials" ON materials;
CREATE POLICY "Admins can manage materials" ON materials
  FOR ALL USING (is_admin());

-- Stock transactions: All authenticated can read and insert
DROP POLICY IF EXISTS "Authenticated users can read transactions" ON stock_transactions;
CREATE POLICY "Authenticated users can read transactions" ON stock_transactions
  FOR SELECT USING (is_authenticated());

DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON stock_transactions;
CREATE POLICY "Authenticated users can insert transactions" ON stock_transactions
  FOR INSERT WITH CHECK (is_authenticated());

DROP POLICY IF EXISTS "Admins can manage transactions" ON stock_transactions;
CREATE POLICY "Admins can manage transactions" ON stock_transactions
  FOR ALL USING (is_admin());

-- Shipments: All authenticated can read and manage
DROP POLICY IF EXISTS "Authenticated users can read shipments" ON shipments;
CREATE POLICY "Authenticated users can read shipments" ON shipments
  FOR SELECT USING (is_authenticated());

DROP POLICY IF EXISTS "Authenticated users can manage shipments" ON shipments;
CREATE POLICY "Authenticated users can manage shipments" ON shipments
  FOR ALL USING (is_authenticated());

-- Shipment items: All authenticated can read and manage
DROP POLICY IF EXISTS "Authenticated users can read shipment items" ON shipment_items;
CREATE POLICY "Authenticated users can read shipment items" ON shipment_items
  FOR SELECT USING (is_authenticated());

DROP POLICY IF EXISTS "Authenticated users can manage shipment items" ON shipment_items;
CREATE POLICY "Authenticated users can manage shipment items" ON shipment_items
  FOR ALL USING (is_authenticated());

-- Bookings: All authenticated can read and manage
DROP POLICY IF EXISTS "Authenticated users can read bookings" ON bookings;
CREATE POLICY "Authenticated users can read bookings" ON bookings
  FOR SELECT USING (is_authenticated());

DROP POLICY IF EXISTS "Authenticated users can manage bookings" ON bookings;
CREATE POLICY "Authenticated users can manage bookings" ON bookings
  FOR ALL USING (is_authenticated());

-- Booking materials: All authenticated can read and manage
DROP POLICY IF EXISTS "Authenticated users can read booking materials" ON booking_materials;
CREATE POLICY "Authenticated users can read booking materials" ON booking_materials
  FOR SELECT USING (is_authenticated());

DROP POLICY IF EXISTS "Authenticated users can manage booking materials" ON booking_materials;
CREATE POLICY "Authenticated users can manage booking materials" ON booking_materials
  FOR ALL USING (is_authenticated());

-- System settings: All authenticated can read, only admins can update
DROP POLICY IF EXISTS "Authenticated users can read settings" ON system_settings;
CREATE POLICY "Authenticated users can read settings" ON system_settings
  FOR SELECT USING (is_authenticated());

DROP POLICY IF EXISTS "Admins can manage settings" ON system_settings;
CREATE POLICY "Admins can manage settings" ON system_settings
  FOR ALL USING (is_admin());

-- =====================================================
-- DONE! Run this in Supabase SQL Editor
-- =====================================================
