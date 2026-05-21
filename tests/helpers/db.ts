import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import type { Database } from "@/src/services/supabase/types/database";

// ─── Connection ────────────────────────────────────────────────────────────────
// Local Supabase exposes Postgres on 54322 with the default `postgres` superuser.
// SUPABASE_DB_URL overrides this if the caller set a non-default port/host.

const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

// Every public-schema table that holds test data. Order does not matter —
// TRUNCATE ... CASCADE follows foreign keys. RESTART IDENTITY resets sequences
// so tests don't observe ever-growing bigserial IDs across runs.
//
// Keep this in sync with supabase/migrations/*.sql when new tables are added.
// The list is checked at runtime against information_schema for safety.
const APP_TABLES = [
  "account",
  "badges",
  "booked_slots",
  "coach_availabilities",
  "coach_students",
  "coaches",
  "conversations",
  "course_assignment",
  "courses",
  "lesson_progress",
  "lesson_summaries",
  "lesson_tasks",
  "lessons",
  "messages",
  "parents",
  "plans",
  "session_attendance",
  "sessions",
  "student_availabilities",
  "student_badges",
  "student_subscriptions",
  "student_tokens",
  "students",
  "tokens",
] as const;

// ─── resetDb ──────────────────────────────────────────────────────────────────

/**
 * Truncate every public-schema test table and reset sequences in a single
 * round trip. Bypasses RLS via direct Postgres connection — strictly test
 * infrastructure.
 *
 * Usage in new contract-template test files:
 *
 *   import { resetAll } from "@tests/helpers/db";
 *   beforeEach(resetAll);
 *
 * Does NOT clear `auth.users` — call `resetAuthUsers()` (or `resetAll()`) for
 * that. They're separate because GoTrue lives in its own schema and uses a
 * different client.
 *
 * Migration note: existing integration tests rely on shared `beforeAll`
 * fixtures and will fail if you call this between their tests. Migrate one
 * file at a time — see docs/test-rewrite-runbook.md.
 */
export async function resetDb(): Promise<void> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    const list = APP_TABLES.map((t) => `public."${t}"`).join(", ");
    await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
  } finally {
    await client.end();
  }
}

// ─── resetAuthUsers ───────────────────────────────────────────────────────────

/**
 * Delete every user from `auth.users` via the GoTrue admin API.
 *
 * Required between tests that create accounts: `supabase db reset` does not
 * touch the `auth` schema, and email uniqueness is enforced at insertion, so
 * stale users across tests cause `createAccount()` to fail intermittently.
 *
 * Slower than `resetDb` because it iterates one delete per user. Run AFTER
 * `resetDb` so foreign keys to `auth.users.id` are already cleared.
 */
export async function resetAuthUsers(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "resetAuthUsers: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const db = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    throw new Error(`resetAuthUsers: listUsers failed — ${error.message}`);
  }

  // deleteUser is idempotent; run in parallel for speed.
  await Promise.all(
    data.users.map((u) =>
      db.auth.admin.deleteUser(u.id).then((res) => {
        if (res.error) {
          console.warn(
            `resetAuthUsers: deleteUser(${u.id}) — ${res.error.message}`,
          );
        }
      }),
    ),
  );
}

// ─── resetAll ─────────────────────────────────────────────────────────────────

/** Truncate public-schema tables AND clear auth users. The full reset. */
export async function resetAll(): Promise<void> {
  await resetDb();
  await resetAuthUsers();
}
