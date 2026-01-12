# Backend Docs

## Auth (email + password + OTP verify)
- **Core logic**: [src/services/auth.service.ts](src/services/auth.service.ts) — register hashes password, generates/hashes 6-digit OTP, emails it, inserts user; verify checks OTP hash/expiry and marks verified; login checks password + `is_verified` then returns JWT.
- **HTTP layer**: [src/modules/auth/auth.controller.ts](src/modules/auth/auth.controller.ts) — routes `/auth/register`, `/auth/verify`, `/auth/login`; wires DTOs to service.
- **DTO validation**: [src/modules/auth/dto/register.dto.ts](src/modules/auth/dto/register.dto.ts) (name/email/password), [src/modules/auth/dto/verify.dto.ts](src/modules/auth/dto/verify.dto.ts) (email/otp), [src/modules/auth/dto/login.dto.ts](src/modules/auth/dto/login.dto.ts) (email/password).
- **Supabase client**: [src/modules/supabase/supabase.service.ts](src/modules/supabase/supabase.service.ts) — creates Supabase client with service role key.

### Endpoints
- POST `/auth/register` — Body: `{ "name": "Alice", "email": "alice@example.com", "password": "Password123!" }` → `{ "ok": true }` (OTP emailed; expires in 15 min)
- POST `/auth/verify` — Body: `{ "email": "alice@example.com", "otp": "123456" }` → `{ "ok": true }`
- POST `/auth/login` — Body: `{ "email": "alice@example.com", "password": "Password123!" }` → `{ "access_token": "<JWT>" }`

### DB expectations (auth)
- Table `users` needs: `id` (PK), `name`, `email` (unique), `password_hash`, `is_verified` (bool), `verification_otp_hash` (text, nullable), `verification_expires_at` (timestamptz, nullable), `created_at`.
- SQL helper:
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

## Initial Profile
- **DTO validation**: [src/modules/profile/dto/initial-profile.dto.ts](src/modules/profile/dto/initial-profile.dto.ts) — requires `fullName`, `dob` (ISO date), `gender`, `bloodGroup`, `phone`, `email`, `address`.
- **HTTP layer**: [src/modules/profile/profile.controller.ts](src/modules/profile/profile.controller.ts) — POST `/profile/initial`.
- **Core logic**: [src/services/profile.service.ts](src/services/profile.service.ts) — looks up `users.id` by email; upserts into `initial_profile_data` on `user_id` conflict; returns saved row.

### Endpoint
- POST `/profile/initial` — Body:
```json
{
  "fullName": "Srinivas",
  "dob": "1999-01-01",
  "gender": "Male",
  "bloodGroup": "A+",
  "phone": "+91 98765 43210",
  "email": "naidusrinivas035@gmail.com",
  "address": "Hyderabad, India"
}
```
Response: `{ "ok": true, "profile": { ...row... } }` (upserted by user_id)

- GET `/profile/initial` — Query: `?email=alice@example.com` → returns `{ "ok": true, "profile": { ...row... } }` or 404 if missing.

### DB expectations (initial profile)
- Table `initial_profile_data`:
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
- Upsert key matches code (`onConflict: user_id`).

## Home (Dashboard)
- **DTO validation**: [src/modules/home/dto/get-home.dto.ts](src/modules/home/dto/get-home.dto.ts) — requires `email`; optional `latitude`, `longitude`, `radiusKm` for location-based filtering.
- **HTTP layer**: [src/modules/home/home.controller.ts](src/modules/home/home.controller.ts) — GET `/home`.
- **Core logic**: [src/services/home.service.ts](src/services/home.service.ts) — aggregates user stats (name, blood type, donations, points), fetches open blood requests (with time-ago formatting), and upcoming camps (ordered by date).

### Endpoint
- GET `/home` — Query: `?email=alice@example.com&latitude=19.0760&longitude=72.8777&radiusKm=5` (latitude/longitude/radiusKm optional)
  - Response:
  ```json
  {
    "userStats": {
      "userName": "Rahul Kumar",
      "bloodType": "A+",
      "donations": 5,
      "points": 850
    },
    "nearbyRequests": [
      {
        "id": "req-123",
        "bloodType": "A+",
        "hospital": "Apollo Hospital",
        "location": "Pune, Maharashtra",
        "distance": "2.3 km",
        "timeAgo": "15 min ago",
        "units": 2,
        "urgent": true
      }
    ],
    "upcomingCamps": [
      {
        "id": "camp-456",
        "title": "Community Health Center",
        "location": "Shivajinagar, Pune",
        "date": "2025-11-15",
        "time": "09:00:00 - 17:00:00"
      }
    ]
  }
  ```

### DB expectations (home)
- Uses existing tables:
  - `users` — for user name/id
  - `initial_profile_data` — for blood type
  - `user_stats` — for donations/points
  - `blood_requests` — open requests, ordered by created_at
  - `blood_camps` — upcoming camps, ordered by camp_date

