-- Lock down Supabase's auto-generated REST API so the ONLY way to reach these
-- tables is through the Nest backend (which uses the service_role key and
-- bypasses RLS by design).
--
-- Why: every table in the `public` schema is exposed at
-- https://<project>.supabase.co/rest/v1/<table>. With RLS disabled, anyone who
-- has the anon key (it is meant to be public / shipped in frontends) can read
-- and write e.g. users.password_hash directly, skipping all backend checks.
--
-- Enabling RLS with NO policies = deny everything for anon/authenticated.
-- service_role is unaffected, so the backend keeps working.
--
-- Run in: Supabase Dashboard → SQL Editor. Safe to run more than once.

ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initial_profile_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_camps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_donors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organ_donors         ENABLE ROW LEVEL SECURITY;

-- Defense in depth: also remove table privileges from the public API roles,
-- so a policy added by mistake later can't silently reopen access.
REVOKE ALL ON public.users, public.initial_profile_data, public.user_stats,
              public.blood_requests, public.blood_camps,
              public.blood_donors, public.organ_donors
  FROM anon, authenticated;

-- Verify: every row should show rls_enabled = true.
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
ORDER BY relname;
