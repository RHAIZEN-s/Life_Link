-- Bootstrapping admins (run manually in the Supabase SQL Editor).
--
-- 1. Sign up normally in the app (or POST /api/v1/auth/register) and verify
--    the email. Then promote that account to platform super admin:

update public.users
   set role = 'super_admin', hospital_id = null
 where email = 'you@example.com';

-- 2. Log in again (or wait for the next token refresh) to pick up the role.
--    From then on, use the API instead of SQL:
--      POST /api/v1/admin/hospitals               register a hospital
--      POST /api/v1/admin/hospitals/{id}/admins   make a user that hospital's admin
--
-- Equivalent SQL, if you prefer:
--
-- insert into public.hospitals (name, registration_no, address, city, state, latitude, longitude, phone, email, is_verified)
-- values ('Asha Hospital', 'MH-HOSP-99821', 'Plot 21, Marine Lines', 'Mumbai', 'Maharashtra',
--         18.9431, 72.8236, '+919876543210', 'admin@ashahospital.com', true)
-- returning id;
--
-- update public.users
--    set role = 'hospital_admin', hospital_id = '<hospital id from above>'
--  where email = 'admin@ashahospital.com';
