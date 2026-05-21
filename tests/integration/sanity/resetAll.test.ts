/**
 * Sanity test for the reset helpers in tests/helpers/db.ts.
 *
 * This file is intentionally tiny — it exercises the full path through Vitest's
 * module loader: the `@` and `@tests` aliases, the `pg` devDependency, and the
 * Supabase service-role client. If this file passes, the helpers are wired up
 * correctly and other test files can call `beforeEach(resetAll)` with confidence.
 *
 * Delete this file once the contract-template rewrite is well underway and the
 * helpers are exercised by real tests across multiple domains.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { resetDb, resetAuthUsers, resetAll } from "@tests/helpers/db";
import type { Database } from "@/src/services/supabase/types/database";

function admin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function seedAccount() {
  const db = admin();
  const email = `sanity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: "TestPass123!",
    email_confirm: true,
  });
  if (error) throw new Error(`seedAccount: ${error.message}`);

  // The `account` insert trigger does not fire reliably from auth.admin.createUser
  // in this environment, so insert the row explicitly. Upsert because the trigger
  // *sometimes* does fire (see tests/helpers/factories.ts:86 for the same workaround).
  const { error: acctErr } = await db
    .from("account")
    .upsert({ id: data.user!.id, email, role: 1, new: false }, { onConflict: "id" });
  if (acctErr) throw new Error(`seedAccount: ${acctErr.message}`);
  return data.user!;
}

async function seedPlan() {
  const db = admin();
  const { error } = await db.from("plans").insert({
    name: "Sanity Plan",
    type: "standard",
    classes: 8,
    cents: 1000,
    currency: "usd",
    renewal: "monthly",
    stripe_price_id: `price_sanity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  });
  if (error) throw new Error(`seedPlan: ${error.message}`);
}

async function counts() {
  const db = admin();
  const { count: plans } = await db
    .from("plans")
    .select("*", { count: "exact", head: true });
  const { count: accounts } = await db
    .from("account")
    .select("*", { count: "exact", head: true });
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  return { plans: plans ?? 0, accounts: accounts ?? 0, authUsers: users.users.length };
}

describe("reset helpers (sanity)", () => {
  beforeEach(resetAll);

  it("starts from an empty DB after beforeEach(resetAll)", async () => {
    const c = await counts();
    expect(c).toEqual({ plans: 0, accounts: 0, authUsers: 0 });
  });

  it("resetDb truncates public tables but leaves auth.users in place", async () => {
    await seedAccount();
    await seedPlan();

    const before = await counts();
    expect(before.plans).toBe(1);
    expect(before.accounts).toBe(1); // DB trigger inserts account row on auth.users insert
    expect(before.authUsers).toBe(1);

    await resetDb();

    const after = await counts();
    expect(after.plans).toBe(0);
    expect(after.accounts).toBe(0);
    expect(after.authUsers).toBe(1); // resetDb does NOT touch auth.users
  });

  it("resetAuthUsers clears auth.users", async () => {
    await seedAccount();
    expect((await counts()).authUsers).toBe(1);

    await resetAuthUsers();
    expect((await counts()).authUsers).toBe(0);
  });

  it("resetAll clears both public schema and auth.users", async () => {
    await seedAccount();
    await seedPlan();
    expect(await counts()).toEqual({ plans: 1, accounts: 1, authUsers: 1 });

    await resetAll();
    expect(await counts()).toEqual({ plans: 0, accounts: 0, authUsers: 0 });
  });

  it("is idempotent — calling resetAll twice does not error", async () => {
    await resetAll();
    await resetAll();
    expect(await counts()).toEqual({ plans: 0, accounts: 0, authUsers: 0 });
  });
});
