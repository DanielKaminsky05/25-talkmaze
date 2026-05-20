/**
 * Integration tests for subscription management routes.
 *
 * Routes under test:
 *   POST /api/subscriptions/cancel          — cancel at period end or with refund
 *   POST /api/subscriptions/resume          — undo a scheduled cancellation
 *   POST /api/subscriptions/schedule/cancel — abandon a pending plan change
 *   POST /api/subscriptions/schedule        — initiate a plan upgrade/downgrade
 *
 * Auth/ownership/business-logic tests never reach Stripe.
 * Happy-path tests mock the Stripe client module directly (more reliable than
 * MSW HTTP interception for the Stripe SDK which uses native fetch in Node 18+).
 *
 * NOTE on the schedule route: it returns 404 (not 401) when unauthenticated
 * because it validates priceId before the auth check — a known inconsistency.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  createAccount,
  createStudent,
  createPlan,
  createSubscription,
} from "@tests/helpers/factories";
import { signSessionFor, ANON } from "@tests/helpers/auth";
import { call } from "@tests/helpers/request";
import { server } from "@tests/helpers/msw";

// Mock the Stripe client so happy-path tests can control Stripe responses without
// making real HTTP calls. Auth/business-logic tests never reach Stripe, so the
// mock has no effect on them.
vi.mock("@/src/services/stripe/client", () => ({
  stripe: {
    subscriptions: {
      list: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
    },
    subscriptionSchedules: {
      release: vi.fn(),
    },
    invoices: {
      retrieve: vi.fn(),
      list: vi.fn(),
    },
    invoicePayments: {
      list: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
    },
    customers: {
      retrieve: vi.fn(),
    },
    setupIntents: {
      create: vi.fn(),
    },
  },
}));

import { POST as cancelPOST } from "@/src/app/api/subscriptions/cancel/route";
import { POST as resumePOST } from "@/src/app/api/subscriptions/resume/route";
import { POST as scheduleCancelPOST } from "@/src/app/api/subscriptions/schedule/cancel/route";
import { POST as schedulePOST } from "@/src/app/api/subscriptions/schedule/route";
import { stripe } from "@/src/services/stripe/client";

// ── Fixtures ──────────────────────────────────────────────────────────────────

let ownerCookies: string;
let foreignCookies: string;

let studentWithSubId: string;         // active subscription — used by cancel tests (mutated)
let studentCancelledSubId: string;    // active subscription with cancelled_at set (→ resume)
let studentPendingSchedId: string;    // active subscription with pending schedule (→ schedule/cancel)
let studentNoSubId: string;           // no subscription at all
let studentOldSubId: string;          // active subscription started > 28 days ago (→ refund window test)
let studentForScheduleId: string;     // isolated active subscription for schedule upgrade tests

let currentPlanStripeId: string;      // stripe_price_id of the student's current plan
let targetPlanStripeId: string;       // stripe_price_id of the upgrade target
let targetPlanId: string;             // DB id of the upgrade target (for pending_plan_id check)

const FAKE_CUSTOMER_ID = "cus_test_owner_123";
const FAKE_STRIPE_SUB_ID = "sub_test_123";
const FAKE_SCHED_ID = "sub_sched_test_456";

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "bypass" });

  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Owner account — set a fake Stripe customer ID so routes can pass the customer lookup
  const owner = await createAccount({ role: 1 });
  ownerCookies = await signSessionFor(owner);
  await adminDb
    .from("account")
    .update({ stripe_customer_id: FAKE_CUSTOMER_ID })
    .eq("id", owner.id);

  // Foreign account — owns its own students, used to test ownership rejection
  const foreign = await createAccount({ role: 1 });
  foreignCookies = await signSessionFor(foreign);

  // Plans
  const currentPlan = await createPlan({
    classes: 8,
    stripe_price_id: `price_current_${Date.now()}`,
  });
  currentPlanStripeId = currentPlan.stripe_price_id!;

  const targetPlan = await createPlan({
    classes: 12,
    stripe_price_id: `price_target_${Date.now()}`,
  });
  targetPlanStripeId = targetPlan.stripe_price_id!;
  targetPlanId = targetPlan.id;

  // Student 1 — clean active subscription (used for most cancel/schedule tests)
  const s1 = await createStudent(owner);
  studentWithSubId = s1.id;
  await createSubscription(s1, currentPlan, { status: "active" });

  // Student 2 — subscription already scheduled for cancellation (cancelled_at set)
  const s2 = await createStudent(owner);
  studentCancelledSubId = s2.id;
  await createSubscription(s2, currentPlan, {
    status: "active",
    cancelled_at: new Date().toISOString(),
  });

  // Student 3 — subscription with a pending plan change schedule
  const s3 = await createStudent(owner);
  studentPendingSchedId = s3.id;
  await createSubscription(s3, currentPlan, {
    status: "active",
    pending_stripe_schedule_id: FAKE_SCHED_ID,
    pending_plan_id: targetPlan.id,
  } as Parameters<typeof createSubscription>[2]);

  // Student 4 — no subscription
  const s4 = await createStudent(owner);
  studentNoSubId = s4.id;

  // Student 5 — subscription started 29 days ago (outside the 28-day refund window)
  const s5 = await createStudent(owner);
  studentOldSubId = s5.id;
  const oldStart = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
  const oldEnd = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
  await createSubscription(s5, currentPlan, {
    status: "active",
    current_period_start: oldStart.toISOString(),
    current_period_end: oldEnd.toISOString(),
  });

  // Student 6 — isolated from cancel tests; used for schedule upgrade tests
  const s6 = await createStudent(owner);
  studentForScheduleId = s6.id;
  await createSubscription(s6, currentPlan, { status: "active" });
});

afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

// ── Stripe mock helpers ───────────────────────────────────────────────────────

/** Minimal Stripe subscription shape for findActiveStripeSubscriptionByStudent. */
function fakeStripeSub(studentId: string) {
  return {
    id: FAKE_STRIPE_SUB_ID,
    status: "active",
    metadata: { student_id: studentId },
    items: {
      data: [{ id: "si_test", current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30 }],
    },
    latest_invoice: "in_test",
  };
}

/** Seed stripe.subscriptions.list to return one subscription for studentId. */
function mockSubList(studentId: string) {
  vi.mocked(stripe.subscriptions.list).mockResolvedValueOnce(
    { data: [fakeStripeSub(studentId)] } as ReturnType<typeof stripe.subscriptions.list> extends Promise<infer T> ? T : never,
  );
}

/** Seed stripe.invoices.retrieve to return an invoice with a pi_ client_secret. */
function mockInvoiceRetrieve() {
  vi.mocked(stripe.invoices.retrieve).mockResolvedValueOnce({
    id: "in_test",
    confirmation_secret: { client_secret: "pi_test123_secret_abcdef" },
    payments: { data: [] },
  } as never);
}

/** Seed stripe.customers.retrieve to return a fake customer. */
function mockCustomer() {
  vi.mocked(stripe.customers.retrieve).mockResolvedValueOnce({
    id: FAKE_CUSTOMER_ID,
    object: "customer",
    name: "Test Parent",
    email: "test@example.com",
    phone: null,
  } as never);
}

/** Seed stripe.setupIntents.create to return a fake setup intent. */
function mockSetupIntent() {
  vi.mocked(stripe.setupIntents.create).mockResolvedValueOnce({
    id: "seti_test",
    object: "setup_intent",
    client_secret: "seti_test_secret_abcdef",
  } as never);
}

// ── POST /api/subscriptions/cancel ───────────────────────────────────────────

describe("POST /api/subscriptions/cancel", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await call(cancelPOST, {
      method: "POST",
      cookies: ANON.cookies,
      body: { studentId: studentWithSubId },
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the student belongs to a different account", async () => {
    const res = await call(cancelPOST, {
      method: "POST",
      cookies: foreignCookies,
      body: { studentId: studentWithSubId },
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when the student has no active subscription", async () => {
    const res = await call(cancelPOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentNoSubId },
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when a refund is requested outside the 28-day window", async () => {
    const res = await call(cancelPOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentOldSubId, refund: true },
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 and schedules cancellation at period end (no refund)", async () => {
    mockSubList(studentWithSubId);
    const res = await call(cancelPOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentWithSubId, refund: false },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });

  it("returns 200 and issues a refund when within the 28-day window", async () => {
    // studentWithSubId subscription was started now — well within the window.
    // After the previous test, cancelled_at is set but status is still "active".
    mockSubList(studentWithSubId);
    mockInvoiceRetrieve();
    const res = await call(cancelPOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentWithSubId, refund: true },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });
});

// ── POST /api/subscriptions/resume ───────────────────────────────────────────

describe("POST /api/subscriptions/resume", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await call(resumePOST, {
      method: "POST",
      cookies: ANON.cookies,
      body: { studentId: studentCancelledSubId },
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the student belongs to a different account", async () => {
    const res = await call(resumePOST, {
      method: "POST",
      cookies: foreignCookies,
      body: { studentId: studentCancelledSubId },
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when the student has no subscription scheduled for cancellation", async () => {
    // studentNoSubId has no subscription at all — same 404 path
    const res = await call(resumePOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentNoSubId },
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when the subscription is active but has no cancellation scheduled", async () => {
    // studentPendingSchedId has an active subscription but cancelled_at is null
    const res = await call(resumePOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentPendingSchedId },
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 and clears the cancellation schedule", async () => {
    mockSubList(studentCancelledSubId);
    const res = await call(resumePOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentCancelledSubId },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });
});

// ── POST /api/subscriptions/schedule/cancel ───────────────────────────────────

describe("POST /api/subscriptions/schedule/cancel", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await call(scheduleCancelPOST, {
      method: "POST",
      cookies: ANON.cookies,
      body: { studentId: studentPendingSchedId },
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the student belongs to a different account", async () => {
    const res = await call(scheduleCancelPOST, {
      method: "POST",
      cookies: foreignCookies,
      body: { studentId: studentPendingSchedId },
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when the student has no pending plan change", async () => {
    const res = await call(scheduleCancelPOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentNoSubId },
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when the subscription exists but has no pending schedule", async () => {
    // studentCancelledSubId has an active sub but no pending_stripe_schedule_id
    const res = await call(scheduleCancelPOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentCancelledSubId },
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 and clears the pending plan change", async () => {
    // The Stripe schedule release is wrapped in try/catch — no Stripe mock needed
    const res = await call(scheduleCancelPOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentPendingSchedId },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });
});

// ── POST /api/subscriptions/schedule (plan upgrade/downgrade) ─────────────────

describe("POST /api/subscriptions/schedule", () => {
  it("returns 400 when priceId is missing", async () => {
    const res = await call(schedulePOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentWithSubId },
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 (not 401) when unauthenticated — priceId check runs before auth", async () => {
    const res = await call(schedulePOST, {
      method: "POST",
      cookies: ANON.cookies,
      body: { studentId: studentWithSubId, priceId: targetPlanStripeId },
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when the student belongs to a different account", async () => {
    const res = await call(schedulePOST, {
      method: "POST",
      cookies: foreignCookies,
      body: { studentId: studentWithSubId, priceId: targetPlanStripeId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when the student has no active subscription", async () => {
    const res = await call(schedulePOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentNoSubId, priceId: targetPlanStripeId },
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when the target priceId does not match any plan", async () => {
    const res = await call(schedulePOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentWithSubId, priceId: "price_nonexistent_999" },
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 when the student is already on the requested plan", async () => {
    // studentForScheduleId is subscribed to currentPlan — requesting the same plan
    const res = await call(schedulePOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentForScheduleId, priceId: currentPlanStripeId },
    });
    expect(res.status).toBe(409);
    const body = await res.json<{ error: string }>();
    expect(body.error).toContain("already on this plan");
  });

  it("returns 409 when a change to the target plan is already scheduled", async () => {
    // studentPendingSchedId has pending_plan_id = targetPlan.id
    // After the schedule/cancel test ran, that was cleared — so we use a fresh fixture.
    // Create a fresh student inline for this specific state check.
    const adminDb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: ownerAccount } = await adminDb
      .from("account")
      .select("id")
      .eq("stripe_customer_id", FAKE_CUSTOMER_ID)
      .single();

    const freshOwner = { id: ownerAccount!.id, email: "", password: "", role: 1 };
    const sched = await createStudent(freshOwner);
    const plan = await createPlan({ stripe_price_id: `price_base_${Date.now()}` });
    const target = await createPlan({ stripe_price_id: `price_scheduled_${Date.now()}` });
    await createSubscription(sched, plan, {
      status: "active",
      pending_plan_id: target.id,
      pending_stripe_schedule_id: "sub_sched_inline",
    } as Parameters<typeof createSubscription>[2]);

    const res = await call(schedulePOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: sched.id, priceId: target.stripe_price_id },
    });
    expect(res.status).toBe(409);
    const body = await res.json<{ error: string }>();
    expect(body.error).toContain("already scheduled");
  });

  it("returns 200 with clientSecret, prefill, and effectiveDate on success", async () => {
    mockCustomer();
    mockSubList(studentForScheduleId);
    mockSetupIntent();
    const res = await call(schedulePOST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId: studentForScheduleId, priceId: targetPlanStripeId },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{
      clientSecret: string;
      prefill: { name: string; email: string; phone: string };
      effectiveDate: string;
    }>();
    expect(body.clientSecret).toBeTruthy();
    expect(body.prefill.email).toBeTruthy();
    expect(body.effectiveDate).toBeTruthy();
  });
});
