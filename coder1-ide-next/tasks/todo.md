# Alpha Waitlist — Supabase Migration

## Goal
Replace SQLite (ephemeral on Render) with Supabase so waitlist signups persist across deploys.
Add Resend email notification to Mike on every new signup.

## Tasks

- [x] Audit current SQLite implementation
- [x] Create Supabase migration SQL (`db/supabase-alpha-waitlist.sql`)
- [x] Rewrite `app/api/alpha/waitlist/route.ts` — Supabase + Resend
- [x] Rewrite `app/api/alpha/export/route.ts` — Supabase
- [x] Verify env vars are in place

## Review

Migration complete. Two route files rewritten, SQLite removed entirely.
Action required from Mike: (1) run Supabase SQL, (2) add env vars to Render.
