# Intellifoam Development Instructions

This document tracks all features, requirements, and implementation details for the Intellifoam CRM system. Keep this updated as features are added or modified.

---

## Table of Contents
1. [Current State](#current-state)
2. [Phase 2 Features](#phase-2-features)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Email Templates](#email-templates)
6. [Discord Integration](#discord-integration)
7. [Inventory System](#inventory-system)
8. [Configuration](#configuration)

---

## Current State

### Completed Features
- **Calculator**: Expert calculator at `/kalkylator` with 4-step process
- **Quote Requests**: Customers can submit quote requests
- **Admin Panel**: Basic admin at `/admin`
  - Quote management at `/admin/quotes`
  - User management at `/admin/users` (admin only)
  - Profile management at `/admin/profile`
- **PDF Generation**: Quote PDFs with Intellifoam branding
- **ROT Information**: Link-based ROT data collection
- **Distance Calculation**: Using OpenStreetMap/OSRM
- **User Authentication**: Supabase Auth with roles (admin, installer)

### Technology Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **PDF**: @react-pdf/renderer
- **Deployment**: Vercel
- **Language**: Swedish (all UI text)
- **AI/Automation**: n8n at n8n.gronteknik.nu

---

## Phase 2 Features

### 1. Admin Panel Restructuring

#### Navigation Structure
```
/admin                    → Dashboard (new default page)
/admin/quotes             → Quote requests list
/admin/quotes/[id]        → Individual quote management
/admin/inventory          → Material inventory (NEW)
/admin/calendar           → Installation & visit calendar (NEW)
/admin/settings           → Settings with tabs:
  - Prissättning (Pricing)
  - Projektmultiplikatorer (Project multipliers - TIME ONLY)
  - Byggnadsfysik (Building physics)
  - Meddelanden (Message templates)
  - Villkor (Terms and conditions)
  - Variabler (Cost variables)
  - Lager (Inventory settings - min stock levels)
  - Prognos (Forecast settings - conversion rates)
/admin/users              → User management (admin only)
/admin/profile            → Current user profile
```

#### Dashboard Components

**Statistik (Statistics cards)**:
- Inkomna offertförfrågningar (Incoming quote requests)
- Skickade offerter (Sent offers)
- Accepterade offerter (Accepted offers)
- Bokade installationer (Booked installations)

**Kommande besök och installationer (Upcoming visits & installations)**:
- Separate list showing scheduled visits and installations
- Color coding:
  - Normal: Nothing else on that day
  - Orange: Another booking on same day
  - Red: Not enough material for installation

**Lagerprognos (Stock forecast)**:
- Stock in 7 days
- Stock in 30 days
- Days until we run out (per material)

**Att göra-lista (To-do list)**:
Auto-generated tasks based on quote status:
- Granska ny offertförfrågan (Review new quote request)
- Skicka offert till kund (Send offer to customer)
- Skicka länk för ifyllnad av ROT-underlag (Send ROT link)
- Följ upp offert - inget svar på X dagar (Follow up - no response)
- Offert godkänd - boka installation (Offer accepted - book installation)
- Bekräfta installationsdatum (Confirm installation date)
- Materialbrist - beställ mer (Low stock - order more)
- Leverans anländer [datum] (Shipment arriving)
- Skicka faktura efter installation (Send invoice after installation)

**Prognos (Revenue & material forecast)**:
- Projicerade intäkter (Projected revenue)
- Projicerat materialbehov (Projected material needs)
- Based on configurable conversion rates

### 2. Project Multipliers (Projektmultiplikatorer)

**IMPORTANT**: Multipliers affect LABOR TIME only, NOT materials.

```typescript
interface ProjectMultiplier {
  id: number;
  name: string;           // e.g., "Vind (Attic)"
  labor_multiplier: number; // e.g., 1.2 for 20% more time
  description: string;
  is_active: boolean;
}
```

### 3. Quote/Offer Management

#### Customer Data Editing
Admin can edit customer details on quote card:
- Namn (Name)
- E-post (Email)
- Telefon (Phone)
- Adress (Address)

#### Offer Signing (Digital Signature) ✅ IMPLEMENTED
Simple digital signature that records:
- Customer name (typed signature)
- Offer number
- Total price accepted
- Timestamp (date and time)
- IP address
- Status updates: pending → sent → accepted/rejected

**Implementation:**
- Customer offer page: `/offert/[token]`
- API routes: `/api/offer/[token]`, `/api/offer/[token]/accept`, `/api/offer/[token]/reject`
- Send offer: `/api/admin/quotes/[id]/send-offer`
- Fields added to quote_requests: offer_token, accepted_at, rejected_at, signed_name, signed_ip

#### Booking from Quote Page
Even before sending offer, admin can:
- Schedule a visit (hembesök)
- Schedule an installation
- This enables material projection on dashboard

### 4. Email System ✅ IMPLEMENTED

#### Configuration
- **SMTP Server**: smtp.gmail.com (port 587, TLS)
- **From Address**: foam@gronteknik.nu (via Gmail)
- **Auth User**: pelle@gronteknik.nu with app password
- **Library**: nodemailer

#### Environment Variables
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=pelle@gronteknik.nu
SMTP_PASS=[Gmail app password]
SMTP_FROM=foam@gronteknik.nu
```

#### Files
- `/lib/email.ts` - Email sending utilities and template handling

#### Message Templates (stored in database)
```typescript
interface MessageTemplate {
  id: number;
  type: 'offer' | 'rot_link' | 'installation_confirmation' | 'visit_confirmation' | 'invoice' | 'follow_up';
  subject: string;
  body: string;           // Supports {{variables}}
  is_default: boolean;
  created_at: timestamp;
  updated_at: timestamp;
}
```

#### Template Variables
- `{{customer_name}}` - Kundens namn
- `{{offer_number}}` - Offertnummer
- `{{total_amount}}` - Totalt belopp
- `{{valid_until}}` - Giltig till datum
- `{{installation_date}}` - Installationsdatum
- `{{visit_date}}` - Besöksdatum
- `{{company_name}}` - Intellifoam
- `{{offer_link}}` - Länk till offert
- `{{rot_link}}` - Länk till ROT-formulär

### 5. Terms and Conditions (Villkor)

New admin tab for managing terms and conditions:
- Each bullet point stored as separate entry
- Admin can add/remove/reorder points
- Just text input per point - system handles formatting
- Used in PDF generation

```typescript
interface TermsCondition {
  id: number;
  order_index: number;
  text: string;
  is_active: boolean;
  created_at: timestamp;
  updated_at: timestamp;
}
```

### 6. ROT Information Handling

- Link already works for customer input
- **NEW**: Admin can fill in ROT info manually on quote page
- **NEW**: Email ROT link to customer with editable template
- Template editable in settings AND before sending

### 7. Discord Integration ✅ IMPLEMENTED

#### Configuration
- **Webhook URL**: Set in Vercel env as `DISCORD_WEBHOOK_URL`
- **File**: `/lib/discord.ts`

#### Notification Types Implemented
- 🆕 Ny offertförfrågan (New quote request) - notifyNewQuoteRequest
- 📧 Offert skickad (Offer sent) - notifyOfferSent
- ✅ Offert accepterad (Offer accepted) - notifyOfferAccepted
- ❌ Offert avböjd (Offer rejected) - notifyOfferRejected
- 📦 Materialbrist (Low stock alert) - notifyLowStock
- 🚚 Leverans anländer (Shipment arriving) - notifyShipmentArriving
- 📅 Installation bokad (Installation booked) - notifyInstallationBooked
- Custom messages - sendCustomNotification

#### n8n Integration
- Server: n8n.gronteknik.nu
- Use for AI-enhanced messages and automation
- Can enhance notifications with context/summaries

### 8. Inventory System

#### Materials to Track
Initial materials:
1. **Sluten cellskum (Closed cell foam)** - kg
2. **Öppen cellskum (Open cell foam)** - kg

#### Minimum Stock Levels
Configurable per material in Settings → Lager submenu

#### Stock Projections Dashboard
- Current stock
- Stock in 7 days (after scheduled installations)
- Stock in 30 days
- Days until out of stock

#### Incoming Shipments
- Track expected deliveries
- Expected arrival date
- Quantity per material
- Status: ordered → shipped → received

### 9. Calendar & Scheduling

#### Event Types
1. **Hembesök (Visit)** - Site inspection
2. **Installation** - Actual installation work

#### Visual Indicators
- No other bookings: Normal display
- Other booking same day: Orange highlight
- Insufficient material: Red highlight

#### Booking Rules
- Can book same day
- Not required until signed offer
- Can book tentatively from quote page (for projections)
- Installation blocked if insufficient material (with warning)

### 10. Forecasting

#### Conversion Rates (Configurable in Settings → Prognos)
Default values:
- **Signed/Accepted offers**: 100%
- **Sent offers (awaiting response)**: 50%
- **Pending (not yet sent)**: 10%

#### Calculations
- Projected revenue = Σ(quote_value × conversion_rate_for_status)
- Projected materials = Σ(quote_materials × conversion_rate_for_status)
- Time horizons: 7 days, 30 days, 90 days

---

## Database Schema Updates

### New Tables

#### `terms_conditions`
```sql
CREATE TABLE terms_conditions (
  id SERIAL PRIMARY KEY,
  order_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `message_templates`
```sql
CREATE TABLE message_templates (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `materials`
```sql
CREATE TABLE materials (
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
```

#### `stock_transactions`
```sql
CREATE TABLE stock_transactions (
  id SERIAL PRIMARY KEY,
  material_id INTEGER REFERENCES materials(id),
  quantity DECIMAL(10,2) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL, -- 'delivery', 'installation', 'adjustment', 'reserved'
  reference_type VARCHAR(20), -- 'quote', 'shipment', 'manual'
  reference_id INTEGER,
  transaction_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `shipments`
```sql
CREATE TABLE shipments (
  id SERIAL PRIMARY KEY,
  supplier VARCHAR(100),
  order_number VARCHAR(50),
  expected_date DATE,
  received_date DATE,
  status VARCHAR(20) DEFAULT 'ordered', -- 'ordered', 'shipped', 'received'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `shipment_items`
```sql
CREATE TABLE shipment_items (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id),
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2)
);
```

#### `bookings`
```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER REFERENCES quote_requests(id),
  booking_type VARCHAR(20) NOT NULL, -- 'visit', 'installation'
  scheduled_date DATE NOT NULL,
  scheduled_time VARCHAR(20), -- e.g., "08:00-12:00"
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `booking_materials`
```sql
CREATE TABLE booking_materials (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id),
  estimated_quantity DECIMAL(10,2),
  actual_quantity DECIMAL(10,2)
);
```

#### `system_settings`
```sql
CREATE TABLE system_settings (
  key VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings
INSERT INTO system_settings (key, value) VALUES
  ('conversion_rates', '{"signed": 100, "sent": 50, "pending": 10}'),
  ('follow_up_days', '7'),
  ('discord_webhook_url', '""'),
  ('smtp_config', '{}');
```

### Quote Requests Updates
Add columns to existing `quote_requests` table:
```sql
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS signed_name VARCHAR(200);
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS signed_ip VARCHAR(45);
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS offer_token VARCHAR(64);
```

---

## API Endpoints

### Existing
- `GET/POST /api/admin/pricing` - Pricing rules
- `GET/POST /api/admin/quotes` - Quote management
- `GET/POST /api/contact` - Quote request submission

### New Endpoints

#### Dashboard
- `GET /api/admin/dashboard` - All dashboard data

#### Templates
- `GET /api/admin/templates` - List all templates
- `POST /api/admin/templates` - Create template
- `PUT /api/admin/templates/[id]` - Update template
- `DELETE /api/admin/templates/[id]` - Delete template

#### Terms & Conditions
- `GET /api/admin/terms` - List all terms
- `POST /api/admin/terms` - Create term
- `PUT /api/admin/terms/[id]` - Update term
- `PUT /api/admin/terms/reorder` - Reorder terms
- `DELETE /api/admin/terms/[id]` - Delete term

#### Materials & Inventory
- `GET /api/admin/materials` - List materials
- `POST /api/admin/materials` - Create material
- `PUT /api/admin/materials/[id]` - Update material
- `POST /api/admin/materials/[id]/adjust` - Adjust stock

#### Shipments
- `GET /api/admin/shipments` - List shipments
- `POST /api/admin/shipments` - Create shipment
- `PUT /api/admin/shipments/[id]` - Update shipment
- `POST /api/admin/shipments/[id]/receive` - Mark as received

#### Bookings
- `GET /api/admin/bookings` - List bookings
- `POST /api/admin/bookings` - Create booking
- `PUT /api/admin/bookings/[id]` - Update booking
- `DELETE /api/admin/bookings/[id]` - Cancel booking
- `GET /api/admin/bookings/availability` - Check date availability

#### Email
- `POST /api/admin/quotes/[id]/send-offer` - Send offer email
- `POST /api/admin/quotes/[id]/send-rot-link` - Send ROT link email
- `POST /api/admin/quotes/[id]/send-followup` - Send follow-up email

#### Customer-facing (public)
- `GET /api/offer/[token]` - View offer
- `POST /api/offer/[token]/accept` - Accept & sign offer
- `POST /api/offer/[token]/reject` - Reject offer

#### Settings
- `GET /api/admin/settings` - Get all settings
- `PUT /api/admin/settings/[key]` - Update setting

#### Discord
- `POST /api/discord/notify` - Send Discord notification (internal)

---

## Email Templates

### Offert (Offer Email)
```
Ämne: Offert från Intellifoam - {{offer_number}}

Hej {{customer_name}},

Tack för din förfrågan! Bifogat hittar du vår offert för sprutisoleringen.

Offerten är giltig till {{valid_until}}.

Klicka här för att se och godkänna offerten:
{{offer_link}}

Har du frågor? Kontakta oss på 010 703 74 00 eller info@intellifoam.se.

Med vänliga hälsningar,
Intellifoam
```

### ROT-länk
```
Ämne: Underlag för ROT-avdrag - Intellifoam

Hej {{customer_name}},

För att vi ska kunna hjälpa dig med ROT-avdraget behöver vi lite uppgifter.

Klicka på länken nedan för att fylla i formuläret:
{{rot_link}}

Med vänliga hälsningar,
Intellifoam
```

### Uppföljning (Follow-up)
```
Ämne: Påminnelse: Din offert från Intellifoam

Hej {{customer_name}},

Vi vill bara påminna om offerten vi skickade. Den är fortfarande giltig till {{valid_until}}.

Se offerten här:
{{offer_link}}

Hör av dig om du har frågor!

Med vänliga hälsningar,
Intellifoam
```

---

## Configuration

### Environment Variables Needed
```
# Email (SMTP)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=pelle@gronteknik.nu
SMTP_PASS=

# Discord
DISCORD_WEBHOOK_URL=

# n8n
N8N_BASE_URL=https://n8n.gronteknik.nu
N8N_API_KEY=
```

### Conversion Rate Defaults
- Signed/Accepted: 100%
- Sent/Offered: 50%
- Pending/Not answered: 10%

---

## Implementation Order

1. ✅ Fix integer overflow in quotes
2. ⬜ Database schema updates (new tables)
3. ⬜ Admin panel restructuring with tabs
4. ⬜ Dashboard page with statistics
5. ⬜ Settings page with all tabs
6. ⬜ Terms & conditions management
7. ⬜ Project multipliers (labor only)
8. ⬜ Message templates system
9. ⬜ Customer data editing on quote page
10. ⬜ Inventory management system
11. ⬜ Booking/calendar system
12. ⬜ Stock projections & forecasting
13. ⬜ Email sending (need SMTP details)
14. ⬜ Offer signing flow
15. ⬜ Discord webhook integration
16. ⬜ n8n AI integration
17. ⬜ To-do list automation

---

## Open Questions (Need Answers)

1. **SMTP Details**: Server, port, and password for pelle@gronteknik.nu?
2. **Discord Webhook**: Need the webhook URL (not invite link)
3. **n8n Authentication**: API key or other auth method?

---

*Last updated: 2026-02-01*
