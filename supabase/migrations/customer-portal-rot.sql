-- Move customer_token to quote_requests (offer-based portal access)
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS customer_token TEXT UNIQUE;

-- Migrate existing tokens from bookings to their linked quotes
UPDATE quote_requests SET customer_token = b.customer_token
FROM bookings b WHERE b.quote_id = quote_requests.id AND b.customer_token IS NOT NULL;

-- Add ROT max per person (default 50000 SEK per Swedish law)
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS rot_max_per_person INTEGER DEFAULT 50000;

-- Add customer's self-declared max ROT per person (JSONB with per-person overrides)
-- Format: { "0": 35000, "1": 50000 } — index-based per person overrides
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS rot_customer_max JSONB;
