-- Migration: offer open tracking
-- One row per time a customer opens their offer page (/offert/[token]).
-- Minimal by design (no IP / device / PII) — just a timestamp linked to the
-- quote — so the admin can see "Öppnad N ggr, senast ...". RLS enabled with no
-- policy so only the service role (server) can read/write, matching the app's
-- data-access model.

CREATE TABLE IF NOT EXISTS public.offer_views (
  id BIGSERIAL PRIMARY KEY,
  quote_id INTEGER REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_views_quote_id ON public.offer_views(quote_id);

ALTER TABLE public.offer_views ENABLE ROW LEVEL SECURITY;
