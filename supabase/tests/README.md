# Database tests

Runs both migrations against a **throwaway local Postgres** (never your Supabase
project), re-runs them to prove they are idempotent, then exercises the workflow
functions with realistic data: smart matching, compatibility, verification and
suspension filters, appointments, reminders, ratings, points, analytics,
leaderboard privacy, announcements, and the public-API lockdown.

```bash
# Any Postgres 15+ works. Example with a temporary cluster:
initdb -D ./pgtest -U postgres -A trust
pg_ctl -D ./pgtest -o "-p 54329" start
createdb -h localhost -p 54329 -U postgres lltest

psql -h localhost -p 54329 -U postgres -d lltest -v ON_ERROR_STOP=1 -f supabase/tests/00_local_stubs.sql
psql -h localhost -p 54329 -U postgres -d lltest -v ON_ERROR_STOP=1 -f supabase/migrations/20261025000001_lifelink_core_schema.sql
psql -h localhost -p 54329 -U postgres -d lltest -v ON_ERROR_STOP=1 -f supabase/migrations/20261027000001_lifelink_workflows.sql
psql -h localhost -p 54329 -U postgres -d lltest -v ON_ERROR_STOP=1 -f supabase/tests/90_workflow_checks.sql
# → ALL WORKFLOW CHECKS PASSED
```

`00_local_stubs.sql` creates the roles and `storage` schema Supabase provides,
plus the project's **original** pre-migration tables with sample rows, so the
upgrade path is tested too. Do not run it against Supabase.
