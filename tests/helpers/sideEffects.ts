import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/src/services/supabase/types/database";

/**
 * Side-effect assertion helpers for contract-shaped integration tests.
 *
 * Every "happy path" test should follow up its status-code assertion with
 * an `expectRowExists` (the route persisted what it claimed). Every "unauthorized"
 * test should pair the 401/403 with `expectNoRow` (the route didn't write
 * before bouncing the caller).
 *
 * Uses the service-role client to bypass RLS — the goal is to OBSERVE state
 * the route produced, not to reproduce the auth layer here.
 *
 * Per docs/api-contract.md#side-effects-and-idempotency and the
 * test-rewrite-runbook 5-question template (Q4: "What does it persist?").
 */

type PublicTable = keyof Database["public"]["Tables"];
type Predicate = Record<string, unknown>;

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "sideEffects: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function applyPredicate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  predicate: Predicate,
) {
  let q = query;
  for (const [k, v] of Object.entries(predicate)) {
    q = q.eq(k, v);
  }
  return q;
}

/** Returns the matching row or `null`. Throws if more than one matches. */
export async function getRow<T extends PublicTable>(
  table: T,
  predicate: Predicate,
): Promise<Database["public"]["Tables"][T]["Row"] | null> {
  const db = adminDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = applyPredicate(db.from(table as any).select("*"), predicate);
  const { data, error } = await q;
  if (error) {
    throw new Error(
      `getRow(${table}, ${JSON.stringify(predicate)}): ${error.message}`,
    );
  }
  if (data.length > 1) {
    throw new Error(
      `getRow(${table}, ${JSON.stringify(predicate)}): expected ≤1 row, got ${data.length}`,
    );
  }
  return (data[0] as Database["public"]["Tables"][T]["Row"]) ?? null;
}

/**
 * Asserts a row matching `predicate` exists in `table`. Fails the test if
 * zero rows match. Returns the row so the caller can make further assertions
 * on its columns.
 */
export async function expectRowExists<T extends PublicTable>(
  table: T,
  predicate: Predicate,
): Promise<Database["public"]["Tables"][T]["Row"]> {
  const db = adminDb();
  const q = applyPredicate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.from(table as any).select("*", { count: "exact" }),
    predicate,
  );
  const { data, error, count } = await q;
  if (error) {
    throw new Error(
      `expectRowExists(${table}, ${JSON.stringify(predicate)}): ${error.message}`,
    );
  }
  if (!count || count === 0) {
    throw new Error(
      `expectRowExists(${table}, ${JSON.stringify(predicate)}): no rows matched`,
    );
  }
  return data[0] as Database["public"]["Tables"][T]["Row"];
}

/**
 * Asserts NO row matching `predicate` exists in `table`. Use after an
 * unauthorized or invalid request to confirm the route didn't persist before
 * bouncing the caller.
 */
export async function expectNoRow<T extends PublicTable>(
  table: T,
  predicate: Predicate,
): Promise<void> {
  const db = adminDb();
  const q = applyPredicate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.from(table as any).select("id", { count: "exact", head: true }),
    predicate,
  );
  const { error, count } = await q;
  if (error) {
    throw new Error(
      `expectNoRow(${table}, ${JSON.stringify(predicate)}): ${error.message}`,
    );
  }
  if (count && count > 0) {
    throw new Error(
      `expectNoRow(${table}, ${JSON.stringify(predicate)}): expected 0 rows, found ${count}`,
    );
  }
}
