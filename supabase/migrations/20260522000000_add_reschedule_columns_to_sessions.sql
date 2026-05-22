-- Backfill migration for columns added by the parent-reschedule-request
-- feature (commit 5d936c9 feat(scheduling): Add feature for parent to
-- request rescheduling). The feature shipped code that selects and writes
-- these four columns on `sessions`, but no migration was committed to
-- create them in local Supabase — only the remote/prod schema was updated
-- (visible via gen-types in database.ts). Local test runs and fresh
-- supabase start environments hit "column sessions.requested_start_time
-- does not exist" (Postgres 42703) from /api/coach/sessions and
-- /api/coach/sessions/[id].
--
-- `reschedule_status` is a free-text column in the application code; the
-- only non-null value referenced anywhere is the literal 'pending', and
-- there is no DB-level constraint upstream to mirror. Leaving it as nullable
-- text to match the live schema.

ALTER TABLE "public"."sessions"
  ADD COLUMN IF NOT EXISTS "requested_start_time" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "requested_end_time" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "reschedule_status" text,
  ADD COLUMN IF NOT EXISTS "requested_at" timestamp with time zone;
