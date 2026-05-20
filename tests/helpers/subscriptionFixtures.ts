/**
 * DB-fixture helpers for subscription integration tests.
 *
 * These helpers seed real rows in the local Supabase instance via the
 * service-role client. Pair with `beforeEach(resetAll)` in each test file —
 * each test seeds exactly what it needs, no shared state.
 *
 * For Stripe-side mocks see `tests/helpers/stripeMocks.ts`.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/src/services/supabase/types/database";
import {
  createAccount,
  createStudent,
  createPlan,
  createSubscription,
  type TestAccount,
} from "@tests/helpers/factories";
import { signSessionFor } from "@tests/helpers/auth";
import { FAKE_CUSTOMER_ID } from "@tests/helpers/stripeMocks";

function adminDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export type SubscriptionSeedOptions = {
  /** Days ago `current_period_start` was set. Defaults to 1 (well inside the 28-day refund window). */
  periodStartDaysAgo?: number;
  /** Set `cancelled_at` to this ISO string. Defaults to null (no scheduled cancellation). */
  cancelledAt?: string | null;
  /** Set `pending_stripe_schedule_id`. Defaults to null. */
  pendingScheduleId?: string | null;
  /** Set `pending_plan_id`. Defaults to null. */
  pendingPlanId?: string | null;
  /** Override the subscription status. Defaults to "active". */
  status?: "active" | "cancelled" | "past_due";
  /** Plan classes (default 8). */
  classes?: number;
};

export type SeededOwner = {
  owner: TestAccount;
  cookies: string;
  student: Database["public"]["Tables"]["students"]["Row"];
  plan: Database["public"]["Tables"]["plans"]["Row"];
  subscription: Database["public"]["Tables"]["student_subscriptions"]["Row"];
};

/**
 * Seed a parent account with a Stripe customer id, a student, and an active
 * subscription on a fresh plan. Returns everything the test needs to call the
 * route under test as that parent and observe the resulting state.
 */
export async function seedOwnerWithActiveSubscription(
  opts: SubscriptionSeedOptions = {},
): Promise<SeededOwner> {
  const db = adminDb();

  const owner = await createAccount({ role: 1 });
  const cookies = await signSessionFor(owner);
  await db
    .from("account")
    .update({ stripe_customer_id: FAKE_CUSTOMER_ID })
    .eq("id", owner.id);

  const plan = await createPlan({ classes: opts.classes ?? 8 });
  const student = await createStudent(owner);

  const periodStart = new Date(
    Date.now() - (opts.periodStartDaysAgo ?? 1) * 24 * 60 * 60 * 1000,
  );
  const periodEnd = new Date(Date.now() + 27 * 24 * 60 * 60 * 1000);

  const subscription = await createSubscription(student, plan, {
    status: opts.status ?? "active",
    current_period_start: periodStart.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancelled_at: opts.cancelledAt ?? null,
    pending_stripe_schedule_id: opts.pendingScheduleId ?? null,
    pending_plan_id: opts.pendingPlanId ?? null,
  } as Parameters<typeof createSubscription>[2]);

  return { owner, cookies, student, plan, subscription };
}

/**
 * Seed a second role-1 account with no relationship to any other test fixture.
 * Use for "stranger tries to act on someone else's resource" cases.
 */
export async function seedStranger(): Promise<{
  account: TestAccount;
  cookies: string;
}> {
  const account = await createAccount({ role: 1 });
  const cookies = await signSessionFor(account);
  return { account, cookies };
}
