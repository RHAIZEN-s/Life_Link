# Life Link Backend

NestJS 11 API for the Life Link blood and organ donation app, backed by Supabase (Postgres).

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values
npm run start:dev
```

The app refuses to start until `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` (32+ chars) are set.
Without SMTP settings in development, registration OTPs are printed to the server log.

## API documentation

Open [http://localhost:3000/api/docs](http://localhost:3000/api/docs) (Swagger UI) once the server is running.
The raw OpenAPI JSON is at `/api/docs-json`.

Protected endpoints (`/profile`, `/home`, `/search`) need a JWT:

1. `POST /auth/register` → `POST /auth/verify` with the emailed OTP → `POST /auth/login`.
2. Copy `access_token` from the login response.
3. Click **Authorize** in Swagger UI and paste the token (no `Bearer ` prefix).

See [DOCS.md](DOCS.md) for endpoint details and the expected database tables.

## Scripts

```bash
npm run start:dev    # watch mode
npm run build        # compile to dist/
npm run start:prod   # run compiled build
npm run test:e2e     # e2e tests (need a valid .env)
```
