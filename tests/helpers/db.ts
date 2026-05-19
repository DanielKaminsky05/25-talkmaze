import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/src/services/supabase/types/database";

// Service-role client — bypass RLS for test setup/teardown only.
function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.test",
    );
  }
  return createClient<Database>(url, key);
}

// Order matters — child tables before parents so FK constraints don't bite.
const TRUNCATE_ORDER = [
  "student_tokens",
  "student_badges",
  "session_attendance",
  "lesson_summaries",
  "lesson_tasks",
  "lesson_progress",
  "messages",
  "conversations",
  "sessions",
  "booked_slots",
  "coach_students",
  "course_assignment",
  "student_subscriptions",
  "student_availabilities",
  "coach_availabilities",
  "students",
  "parents",
  "coaches",
  "lessons",
  "courses",
  "plans",
  "tokens",
  "badges",
  "account",
] as const;

/**
 * Wipe all application tables and restart sequences.
 * Call from beforeEach in integration tests.
 */
export async function resetDb() {
  const db = adminDb();
  // Truncate in dependency order to avoid FK violations.
  for (const table of TRUNCATE_ORDER) {
    const { error } = await db.from(table as any).delete().neq("id", "");
    if (error) {
      // Some tables have composite PKs or different id column names — ignore
      // "column not found" errors and fall through; cascade handles the rest.
      if (!error.message.includes("does not exist")) {
        console.warn(`resetDb: truncating ${table} failed — ${error.message}`);
      }
    }
  }
}
