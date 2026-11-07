# Life Link Backend — Technical Docs

User journeys, the request lifecycle, the matching algorithm and spec coverage:
**[docs/FLOWS.md](docs/FLOWS.md)**. Interactive API reference: `/api/docs` (Swagger).

## Architecture

```
src/
├── main.ts                  bootstrap: /api/v1 prefix, helmet, CORS, validation, rate limits, Swagger
├── app.module.ts            wires feature modules; env validated by config/env.validation.ts
├── common/                  constants, matching (blood compatibility, alert policy), crypto (AES-GCM),
│                            DB error mapping, dates, query DTOs, validators, upload inspection
├── types/database.types.ts  typed Supabase schema (mirror of the SQL migrations)
└── modules/
    ├── supabase/            Supabase client + Storage wrapper (private buckets, signed URLs)
    ├── mail/                OTP emails (nodemailer)
    ├── auth/                register/verify/login/refresh/logout/reset, global JWT + roles guards, suspension
    ├── profile/             profile, encrypted medical info, organ pledges, avatar, stats, badges,
    │                        preferences, feedback, data export, account deletion
    ├── requests/            request lifecycle, smart-match alerts, responses, invites, ratings, timeline
    ├── appointments/        scheduling, donor booking, confirm, cancel, complete (→ donation), no-show
    ├── donations/           donation history, PDF certificates, hospital verification
    ├── documents/           documents (ID proof puts the account in the verification queue)
    ├── camps/               blood camps, registrations, nearby alerts
    ├── search/              verified donor search (compatible groups)
    ├── community/           leaderboard, public donor profiles
    ├── reports/             user reports + moderation actions (suspend, remove request)
    ├── announcements/       in-app banners / broadcast notifications
    ├── places/              place search + reverse geocoding (OpenStreetMap Nominatim, cached + throttled)
    ├── notifications/       in-app notifications (+ hospital-admin fan-out)
    ├── hospitals/           hospital directory
    ├── home/                role-aware dashboard aggregate
    ├── reminders/           scheduled reminders (appointments, camps, eligibility, stale requests)
    └── admin/               hospital-admin / super-admin endpoints, analytics, user verification
```

Each module has a controller (HTTP + Swagger), a service (business logic) and DTOs
(`class-validator`). Services return camelCase DTOs; snake_case never leaves the DB layer.

## Security model

- **Secure by default.** `JwtAuthGuard` and `RolesGuard` are global; routes opt out with
  `@Public()` and restrict with `@Roles(...)`. Per-record checks (requester / hospital
  coordinator / donor) live in the services.
- **Tokens.** Access token: HS256 JWT, 15 min, issuer/audience checked; claims `sub`, `email`,
  `role`, `hid`. Refresh token: 48 random bytes, stored as SHA-256 hash, 30 days, **rotated on
  every use**; reuse of a rotated token revokes all of the user's sessions.
- **Passwords.** bcrypt (12 rounds), 8–72 chars with a letter and a digit; constant-time login.
- **One-time codes.** 6 digits from `crypto.randomInt`, stored hashed, 15 min, 5 attempts, single use.
- **Accounts.** Email verification required to log in. **Identity verification** (ID proof reviewed
  by an admin) required to appear in searches, be matched or accept requests. **Suspension** blocks
  login and refresh, revokes sessions and closes the user's open requests.
- **Health data.** Free-text medical fields (`existing_diseases`, `genetic_disorder_other`,
  `allergies`, `medications`) are encrypted with **AES-256-GCM** (`DATA_ENCRYPTION_KEY`) before
  they reach the database; legacy plaintext is read transparently and encrypted on next write.
- **Contact privacy.** A request's phone number is only returned to coordinators and donors who
  accepted it. Appointment instructions are only visible to that donor and the coordinators.
  Donor phones appear in search only with `shareContact`. Leaderboard shows first name + initial.
- **Uploads.** Type detected from magic bytes, size-limited, private buckets, 1-hour signed URLs.
- **Abuse limits.** Auth endpoints rate-limited per IP; max 5 active requests per user; one alert
  per donor per request; one open report per reporter per target.
- **Database.** RLS enabled on every table with no policies and no grants for `anon` /
  `authenticated`; functions executable by `service_role` only.
- **Errors.** Postgres errors are mapped to 400/404/409; raw SQL errors are logged, never returned.
- **GDPR-style rights.** `GET /profile/export` (all my data as JSON), `POST /profile/delete`
  (password-confirmed, cascades and removes files).

## Roles

| Role | Can |
|---|---|
| `user` | Donor and/or recipient features. `profiles.registered_as` only tailors the UI; anyone can both donate and request |
| `hospital_admin` | `/admin/*` scoped to their hospital: dashboard, requests (verify, assign, alert, remove), appointments, user verification, documents, donations, camps, announcements, analytics, hospital profile |
| `super_admin` | Everything above platform-wide, plus partner hospitals, assigning hospital admins, reports queue, suspend/reinstate |

Bootstrap the first super admin with [supabase/seed_admin.example.sql](supabase/seed_admin.example.sql).
Role changes take effect on the user's next token refresh (≤ 15 min) or login.

## Data model

Migrations (run in order, both idempotent):
1. [20261025000001_lifelink_core_schema.sql](supabase/migrations/20261025000001_lifelink_core_schema.sql)
2. [20261027000001_lifelink_workflows.sql](supabase/migrations/20261027000001_lifelink_workflows.sql)

Tested against Postgres 18 with the original pre-migration schema and data, including re-runs:
see [supabase/tests](supabase/tests/README.md).

| Table | Purpose |
|---|---|
| `users` | Account: email, name, bcrypt hash, email-verified, role, hospital, **verification_status**, **status** (active/suspended) |
| `auth_otps`, `refresh_tokens` | Hashed one-time codes and refresh tokens |
| `profiles` | DOB, gender, blood group, phone, address + coordinates, avatar, availability, privacy, theme, leaderboard opt-out, encrypted medical details |
| `organ_pledges` | Organs a user pledges |
| `hospitals`, `hospital_staff` | Partner hospitals and key staff |
| `donation_requests` | Requests: lifecycle `pending → matched → in_progress → completed / cancelled`, verified flag, medical proof, flagged |
| `request_responses` | Donor accept/decline (or hospital assignment) per request |
| `request_events` | Request timeline |
| `request_alerts` | Which donors were alerted (dedupe, analytics) |
| `appointments` | `requested → scheduled → completed / cancelled / no_show`, private instructions, linked donation |
| `donations` | Donation history; `verified_at` set by a hospital |
| `ratings` | Requester → donor / hospital (1–5 + comment), once per request |
| `reports` | User reports for moderation |
| `announcements` | In-app banners (audience, city, window) |
| `documents` | Uploaded files metadata + review status |
| `camps`, `camp_registrations` | Blood camps and sign-ups |
| `notifications` | In-app notifications |
| `donor_stats`, `donor_ratings` (views) | Donation counts, points, last donation, next eligibility; average rating |

Eligibility intervals: whole blood 90 days, double red cells 112, plasma 14, platelets 7.
Points: 100 per verified donation + 20 per accepted request.

SQL functions: `match_donors` (smart matching, see FLOWS §6), `list_open_requests`,
`search_donors`, `list_upcoming_camps`, `users_near`, `leaderboard`, `admin_analytics`,
`run_scheduled_reminders`, `broadcast_announcement`, `blood_compatible`.

## Endpoints (`/api/v1`)

| Area | Endpoints |
|---|---|
| Auth (public) | `POST auth/register`, `auth/verify-email` → session, `auth/resend-verification`, `auth/login` → session, `auth/refresh`, `auth/logout`, `auth/forgot-password`, `auth/reset-password` |
| Auth | `GET auth/me` (role, verification, registeredAs, theme) |
| Profile | `GET/PUT profile`, `PATCH profile/preferences`, `POST/DELETE profile/avatar`, `GET profile/feedback`, `GET profile/export`, `POST profile/delete` |
| Home | `GET home?lat&lng` — stats, my active requests, upcoming appointments, compatible nearby requests, camps, announcements, unread count |
| Requests | `GET requests?compatibleOnly&type&lat&lng`, `GET requests/mine?status=active`, `GET requests/responses/mine`, `GET requests/:id`, `GET requests/:id/matches`, `POST requests`, `PATCH requests/:id/status`, `POST requests/:id/responses`, `POST requests/:id/invite`, `POST requests/:id/appointments`, `POST requests/:id/ratings` |
| Appointments | `POST appointments` (book), `GET appointments/mine`, `GET/PATCH appointments/:id`, `POST appointments/:id/cancel`, `/complete`, `/no-show` |
| Donations | `GET/POST donations`, `DELETE donations/:id`, `GET donations/:id/certificate` (PDF) |
| Documents | `GET/POST documents` (multipart), `GET documents/:id/url`, `DELETE documents/:id` |
| Camps | `GET camps`, `GET camps/registered`, `GET camps/:id`, `POST/DELETE camps/:id/registration` |
| Search | `GET search/donors?type=blood&bloodGroup=A%2B&compatible=true` / `?type=organ&organType=kidney` |
| Community | `GET leaderboard?period=all\|year\|month`, `GET donors/:id` |
| Moderation | `POST reports` |
| Announcements | `GET announcements` |
| Places | `GET places/search?query=`, `GET places/reverse?lat&lng` |
| Hospitals | `GET hospitals?query=`, `GET hospitals/:id` |
| Notifications | `GET notifications`, `POST notifications/:id/read`, `POST notifications/read-all` |
| Admin | `GET admin/dashboard`, `GET admin/analytics?from&to&city`, `GET/PATCH admin/hospital`, `POST/DELETE admin/hospital/staff`, `GET admin/requests?status&unverified`, `POST admin/requests/:id/verify\|flag\|assign`, `POST admin/alerts`, `GET admin/appointments`, `GET admin/users`, `GET admin/users/:id`, `PATCH admin/users/:id/verification`, `GET/PATCH admin/documents`, `GET admin/donations/pending`, `POST admin/donations`, `POST admin/donations/:id/verify`, `GET/POST admin/camps`, `PATCH admin/camps/:id`, `GET admin/camps/:id/registrations`, `GET/POST admin/announcements`, `DELETE admin/announcements/:id` |
| Super admin | `POST admin/users/:id/suspend\|reinstate`, `GET/PATCH admin/reports`, `GET/POST admin/hospitals`, `PATCH admin/hospitals/:id`, `POST admin/hospitals/:id/admins` |
| Health | `GET /health` (no prefix, public) |

Sessions are `{ accessToken, refreshToken, expiresIn, user }`. Errors follow Nest's
`{ statusCode, message, error }` shape; validation errors return `message` as an array.

## Operations

- Required env vars are validated at startup (see `.env.example`). New: `DATA_ENCRYPTION_KEY`
  (32 bytes, base64 — back it up; losing it makes encrypted medical fields unreadable),
  `REMINDERS_ENABLED`.
- Reminders run every 10 minutes in the API process; safe with several instances (rows are claimed atomically).
- Set `CORS_ORIGINS` in production.
- `GET /health` for liveness probes.
- After schema changes, update `src/types/database.types.ts` (or regenerate with the Supabase CLI)
  and extend `supabase/tests/90_workflow_checks.sql`.
