# Backend Docs

Interactive docs: `http://localhost:3000/api/docs` (Swagger UI).

## Authentication model
- `/auth/*` endpoints are public (rate limited: `AUTH_RATE_LIMIT_MAX` requests per IP per 15 min, default 10).
- All other endpoints require `Authorization: Bearer <access_token>` from `/auth/login`. The user is taken from the token ([src/modules/auth/jwt-auth.guard.ts](src/modules/auth/jwt-auth.guard.ts)); requests never identify the user by an `email` field.
- Emails are trimmed and lowercased before lookup ([src/common/normalize-email.ts](src/common/normalize-email.ts)).
- The Supabase client uses the service role key, which bypasses row-level security, so the JWT guard is the access control. Keep the key server-side only.
- Run [supabase/enable_rls.sql](supabase/enable_rls.sql) once in the Supabase SQL Editor. It enables RLS (with no policies) and revokes `anon`/`authenticated` access on every table, so Supabase's public REST API can't bypass this backend.

## Database types
- [src/types/database.types.ts](src/types/database.types.ts) types the Supabase client. Hand-written for now; after adding a column, update it or regenerate with `npx supabase gen types typescript --project-id <project-ref> --schema public > src/types/database.types.ts`.

## Auth (email + password + OTP verify)
- **Core logic**: [src/services/auth.service.ts](src/services/auth.service.ts) — register hashes password, generates (crypto-secure) / hashes a 6-digit OTP, stores the user, emails the OTP; verify checks OTP hash/expiry and marks verified; login checks password + `is_verified` then returns a 1h HS256 JWT `{ sub: user.id, email }`.
- Registering again with an email that is not yet verified replaces the password and issues a new OTP, so a failed email never locks the address.
- Without SMTP config: development logs the OTP to the console; production returns 503.
- **HTTP layer**: [src/modules/auth/auth.controller.ts](src/modules/auth/auth.controller.ts).

### Endpoints
- POST `/auth/register` — `{ "name": "Alice", "email": "alice@example.com", "password": "Password123!" }` → `{ "ok": true }` (OTP emailed; expires in 15 min)
- POST `/auth/verify` — `{ "email": "alice@example.com", "otp": "123456" }` → `{ "ok": true }`
- POST `/auth/resend-otp` — `{ "email": "alice@example.com" }` → `{ "ok": true }` (always `ok`, to avoid revealing which emails exist)
- POST `/auth/login` — `{ "email": "alice@example.com", "password": "Password123!" }` → `{ "access_token": "<JWT>" }`

### DB expectations (auth)
- Table `users` needs: `id` (uuid PK), `name`, `email` (unique), `password_hash`, `is_verified` (bool), `verification_otp_hash` (text, nullable), `verification_expires_at` (timestamptz, nullable), `created_at`.
```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_otp_hash text,
  ADD COLUMN IF NOT EXISTS verification_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON public.users (email);
```
- Existing rows with mixed-case emails won't match after normalization. Fix once with:
```sql
UPDATE public.users SET email = lower(trim(email));
UPDATE public.initial_profile_data SET email = lower(trim(email));
```

## Initial Profile (requires token)
- **Core logic**: [src/services/profile.service.ts](src/services/profile.service.ts) — upserts `initial_profile_data` for the logged-in user on `user_id`; `email` comes from the token.

### Endpoints
- POST `/profile/initial` — Body:
```json
{
  "fullName": "Srinivas",
  "dob": "1999-01-01",
  "gender": "Male",
  "bloodGroup": "A+",
  "phone": "+91 98765 43210",
  "address": "Hyderabad, India"
}
```
Response: `{ "ok": true, "profile": { ...row... } }`
- GET `/profile/initial` → `{ "ok": true, "profile": { ...row... } }` or 404.

### DB expectations (initial profile)
```sql
CREATE TABLE IF NOT EXISTS public.initial_profile_data (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  dob date NOT NULL,
  gender text NOT NULL,
  blood_group text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## Home / Dashboard (requires token)
- **Core logic**: [src/services/home.service.ts](src/services/home.service.ts) — user stats, open blood requests (newest first, max 10), upcoming camps (soonest first, max 10).
- GET `/home?latitude=19.0760&longitude=72.8777&radiusKm=5` (all optional; `radiusKm` defaults to 5)
- When `latitude`/`longitude` are given, each request's distance is computed from its own `latitude`/`longitude` columns and requests farther than `radiusKm` are dropped. Requests without coordinates are kept with `"distance": "N/A"`.

### DB expectations (home)
- `users`, `initial_profile_data` (`blood_group`), `user_stats` (`user_id`, `donations`, `points`)
- `blood_requests` (`id`, `blood_type`, `hospital`, `location`, `units`, `urgent`, `status`, `created_at`, and for distances `latitude`, `longitude`):
```sql
ALTER TABLE public.blood_requests
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;
```
- `blood_camps` (`id`, `title`, `location`, `camp_date`, `start_time`, `end_time`, `status`)

## Donor Search (requires token)
- **Core logic**: [src/services/search.service.ts](src/services/search.service.ts) — available donors by type, newest first, max 100, with donor name and phone (loaded in two batched queries).
- POST `/search/donors` — `{ "searchType": "blood", "filterType": "A+" }` or `{ "searchType": "organ", "filterType": "kidney" }` → `{ "results": [...], "total": n }`

### DB expectations (search)
- `blood_donors` (`id`, `user_id`, `blood_type`, `hospital_name`, `location`, `units_available`, `status`, `created_at`)
- `organ_donors` (`id`, `user_id`, `organ_type`, `hospital_name`, `location`, `status`, `created_at`)
