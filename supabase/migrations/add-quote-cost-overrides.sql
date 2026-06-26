-- Migration: per-offer cost overrides
-- Adds a JSONB column on quote_requests holding admin overrides for individual
-- cost drivers (labour rate/hours, driving time, mileage, material margins, etc.)
-- for a SPECIFIC offer. Keys map to cost_variables keys plus the derived
-- quantities spray_hours / distance_km / travel_hours / travel_cost. Absent keys
-- fall back to the global defaults, so an empty/NULL value preserves current
-- behaviour. Applied by the recalculate endpoint and the admin quote editor.

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS cost_overrides JSONB;
