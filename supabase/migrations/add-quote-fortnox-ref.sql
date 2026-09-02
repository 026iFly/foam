-- Migration: store Fortnox references on a quote
-- Holds the created draft invoice number, project number and customer number so
-- the admin sees what was created and we never create duplicates. JSONB so it's
-- flexible; empty/null until an invoice draft is created for the quote.

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS fortnox_ref JSONB;
