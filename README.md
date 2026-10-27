# Life Link Backend

NestJS 11 API for the Life Link blood & organ donation app. Data lives in Supabase
(Postgres + Storage); the API is the only thing allowed to touch it.

## Quick start

```bash
npm install
cp .env.example .env          # fill in Supabase keys and a JWT_SECRET (32+ chars)
npm run start:dev
```

1. **Database:** run [`supabase/migrations/20261025000001_lifelink_core_schema.sql`](supabase/migrations/20261025000001_lifelink_core_schema.sql)
   once in the Supabase SQL Editor (or `supabase db push`). It is idempotent and keeps
   existing data (old ad-hoc tables are renamed to `legacy_*`).
2. **Admins:** follow [`supabase/seed_admin.example.sql`](supabase/seed_admin.example.sql)
   to create the first super admin, then register hospitals through the API.
3. **API docs:** <http://localhost:3000/api/docs> (Swagger). Log in with
   `POST /api/v1/auth/login`, click **Authorize**, paste the `accessToken`.

Without SMTP settings in development, one-time codes are printed to the server log.

## Scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | Run with reload |
| `npm run build` / `npm run start:prod` | Compile to `dist/` / run the build |
| `npm test` | Unit tests |
| `npm run test:e2e` | HTTP tests against the real module graph (needs `.env`; no DB writes) |
| `npm run lint` / `npm run format` | ESLint (type-aware) / Prettier |

See [DOCS.md](DOCS.md) for architecture, security model, data model and endpoints.
