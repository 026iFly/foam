-- Migration: Enable RLS on exposed public tables + fix SECURITY DEFINER views
-- Date: 2026-06-16
--
-- WHY: The Supabase Security Advisor flagged 11 public tables with Row-Level
-- Security disabled and 3 SECURITY DEFINER views. Because the public anon key
-- ships in the client-side JS (NEXT_PUBLIC_SUPABASE_ANON_KEY), anyone on the
-- internet could read/write these tables directly via the PostgREST API.
-- Confirmed live: customer PII (name, email, phone, address) in quote_requests
-- was readable with the anon key.
--
-- WHY THIS IS SAFE: Every data path in the app uses the SERVICE ROLE client
-- (lib/supabase.ts -> createClient(url, SERVICE_ROLE_KEY)), which BYPASSES RLS.
-- No client component or server route uses the anon key for data access
-- (createSupabaseBrowserClient is never called). Middleware uses the anon key
-- only for auth.getUser() and own-profile reads on user_profiles, which already
-- has RLS + policies. Enabling RLS with no policies therefore denies the public
-- anon/authenticated roles while leaving all server-side functionality intact.

-- === 1. Enable RLS (deny anon/authenticated; service role still bypasses) ===
ALTER TABLE public.quote_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_info         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keep_alive           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_variables       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.additional_costs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_multipliers  ENABLE ROW LEVEL SECURITY;

-- === 2. SECURITY DEFINER views -> run with caller's permissions (PG15+) ===
-- Once the underlying tables have RLS, an invoker-rights view returns nothing
-- to the anon role, closing the aggregate-data leak (quote_status_counts,
-- stock_levels) while server-side service-role reads keep working.
ALTER VIEW public.quote_status_counts SET (security_invoker = on);
ALTER VIEW public.upcoming_bookings   SET (security_invoker = on);
ALTER VIEW public.stock_levels        SET (security_invoker = on);

-- === Verification (run after; all should return 0 rows to the anon role) ===
-- Re-run the Security Advisor: the 11 RLS errors + 3 definer-view errors clear.
