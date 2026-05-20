/**
 * Contract tests for `invoice.paid` events on POST /api/webhooks/stripe.
 *
 * Two flows:
 *   - First payment: no prior student_subscriptions row → INSERT one with
 *     plan-derived sessions_remaining + active status + period dates.
 *   - Renewal: existing row → UPDATE plan/status/period/sessions; if a
 *     pending plan was matching → clear pending_*.
 *
 * Mocks: Stripe SDK is mocked at file scope. `stripe.webhooks.constructEvent`
 * is kept REAL so signature verification runs (the test signs fixtures with
 * the test secret via `signWebhookPayload`). Other Stripe SDK calls are
 * mocked because the route's invoice.paid handler retrieves the subscription
 * from Stripe to read metadata + period info.
 *
 * The route also POSTs to /api/webhooks/stripe/learningSpace for room
 * provisioning. The fetch failure is caught and logged by the route, so
 * tests do not stub it.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";

// Mock the Stripe SDK client — keep webhooks.constructEvent real, mock the rest.
vi.mock("@/src/services/stripe/client", async () => {
  const Stripe = (await vi.importActual<typeof import("stripe")>("stripe"))
    .default;
  return {
    stripe: {
      webhooks: Stripe.webhooks,
      subscriptions: {
        retrieve: vi.fn(),
        update: vi.fn(),
      },
      customers: { update: vi.fn() },
      subscriptionSchedules: {
        create: vi.fn(),
        update: vi.fn(),
        release: vi.fn(),
      },
      invoices: { retrieve: vi.fn() },
    },
  };
});

// The webhook now provisions LessonSpace rooms via a direct lib call
// (src/lib/lessonspace/server/provisionStudentRoom). In tests it throws
// because LESSONSPACE_WEBHOOK_URL isn't set; the webhook catches that and
// logs, so no provisioning-side mock is needed. The route still returns 200.

import { createClient } from "@supabase/supabase-js";
import {
  createAccount,
  createStudent,
  createPlan,
  createSubscription,
} from "@tests/helpers/factories";
import { resetAll } from "@tests/helpers/db";
import { server } from "@tests/helpers/msw";
import { expectRowExists, getRow } from "@tests/helpers/sideEffects";
import { signWebhookPayload } from "@tests/helpers/stripe";

import { POST } from "@/src/app/api/webhooks/stripe/route";
import { stripe } from "@/src/services/stripe/client";
import { NextRequest } from "next/server";
import { nextCookies } from "@tests/helpers/nextHeadersMock";

import invoicePaidFixture from "@tests/fixtures/stripe/invoice.paid.json";

const FAKE_STRIPE_CUSTOMER_ID = "cus_test_owner";
const FAKE_STRIPE_SUB_ID = "sub_test_001";
const PRICE_ID = "price_test_invoicepaid";
const PERIOD_START = 1716000000;
const PERIOD_END = 1718592000;

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());
beforeEach(() => {
  vi.clearAllMocks();
});
beforeEach(resetAll);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a signed invoice.paid request for the given (accountId, studentId, priceId). */
function buildInvoicePaidRequest(opts: {
  accountId: string;
  studentId: string;
  priceId: string;
}) {
  const payload = JSON.parse(JSON.stringify(invoicePaidFixture));
  payload.data.object.subscription_details.metadata.account_id = opts.accountId;
  payload.data.object.subscription_details.metadata.student_id = opts.studentId;
  payload.data.object.subscription_details.metadata.price_id = opts.priceId;
  payload.data.object.customer = FAKE_STRIPE_CUSTOMER_ID;
  payload.data.object.subscription = FAKE_STRIPE_SUB_ID;
  // Make event ids unique so idempotency tests don't collide across cases.
  payload.id = `evt_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const { body, headers } = signWebhookPayload(payload);
  nextCookies.header = "";
  return new NextRequest("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    body,
    headers,
  });
}

/** Seed stripe.subscriptions.retrieve to return a subscription tied to (accountId, studentId, priceId). */
function mockSubscriptionRetrieve(opts: {
  accountId: string;
  studentId: string;
  priceId: string;
}) {
  vi.mocked(stripe.subscriptions.retrieve).mockResolvedValueOnce({
    id: FAKE_STRIPE_SUB_ID,
    object: "subscription",
    metadata: {
      account_id: opts.accountId,
      student_id: opts.studentId,
      price_id: opts.priceId,
    },
    default_payment_method: null,
    items: {
      data: [
        {
          id: "si_test",
          price: { id: opts.priceId },
          quantity: 1,
          current_period_start: PERIOD_START,
          current_period_end: PERIOD_END,
        },
      ],
    },
  } as Awaited<ReturnType<typeof stripe.subscriptions.retrieve>>);
}

async function seedAccountAndStudent() {
  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const owner = await createAccount({ role: 1 });
  await adminDb
    .from("account")
    .update({ stripe_customer_id: FAKE_STRIPE_CUSTOMER_ID })
    .eq("id", owner.id);
  const student = await createStudent(owner);
  return { owner, student };
}

// ═════════════════════════════════════════════════════════════════════════════
// FIRST PAYMENT — inserts a brand-new student_subscriptions row
// ═════════════════════════════════════════════════════════════════════════════

describe("Stripe invoice.paid — first payment", () => {
  it("inserts a student_subscriptions row with plan-derived sessions_remaining and active status", async () => {
    const { owner, student } = await seedAccountAndStudent();
    const plan = await createPlan({ classes: 8, stripe_price_id: PRICE_ID });

    mockSubscriptionRetrieve({
      accountId: owner.id,
      studentId: student.id,
      priceId: PRICE_ID,
    });

    const req = buildInvoicePaidRequest({
      accountId: owner.id,
      studentId: student.id,
      priceId: PRICE_ID,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const row = await expectRowExists("student_subscriptions", {
      account_id: owner.id,
      student_id: student.id,
    });
    expect(row.status).toBe("active");
    expect(row.plan_id).toBe(plan.id);
    expect(row.sessions_remaining).toBe(8);
    expect(new Date(row.current_period_start).getTime()).toBe(PERIOD_START * 1000);
    expect(new Date(row.current_period_end).getTime()).toBe(PERIOD_END * 1000);
  });

  it("returns 200 { received: true } to acknowledge the event", async () => {
    const { owner, student } = await seedAccountAndStudent();
    await createPlan({ classes: 8, stripe_price_id: PRICE_ID });
    mockSubscriptionRetrieve({
      accountId: owner.id,
      studentId: student.id,
      priceId: PRICE_ID,
    });

    const req = buildInvoicePaidRequest({
      accountId: owner.id,
      studentId: student.id,
      priceId: PRICE_ID,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { received?: boolean };
    expect(body.received).toBe(true);
  });

  it("does NOT insert a row when the plan lookup fails (price_id not in plans table)", async () => {
    const { owner, student } = await seedAccountAndStudent();
    // No createPlan() — the price_id won't be found.
    mockSubscriptionRetrieve({
      accountId: owner.id,
      studentId: student.id,
      priceId: "price_nonexistent",
    });

    const req = buildInvoicePaidRequest({
      accountId: owner.id,
      studentId: student.id,
      priceId: "price_nonexistent",
    });
    const res = await POST(req);
    expect(res.status).toBe(200); // 200 acknowledged — but no DB row

    const orphan = await getRow("student_subscriptions", {
      account_id: owner.id,
      student_id: student.id,
    });
    expect(orphan).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// RENEWAL — updates the existing row, resets sessions_remaining
// ═════════════════════════════════════════════════════════════════════════════

describe("Stripe invoice.paid — renewal", () => {
  it("updates period dates and resets sessions_remaining on the existing subscription", async () => {
    const { owner, student } = await seedAccountAndStudent();
    const plan = await createPlan({ classes: 12, stripe_price_id: PRICE_ID });

    // Pre-existing subscription with depleted sessions.
    const oldStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldEnd = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    await createSubscription(student, plan, {
      status: "active",
      sessions_remaining: 0,
      current_period_start: oldStart.toISOString(),
      current_period_end: oldEnd.toISOString(),
    });

    mockSubscriptionRetrieve({
      accountId: owner.id,
      studentId: student.id,
      priceId: PRICE_ID,
    });

    const req = buildInvoicePaidRequest({
      accountId: owner.id,
      studentId: student.id,
      priceId: PRICE_ID,
    });
    await POST(req);

    const row = await expectRowExists("student_subscriptions", {
      account_id: owner.id,
      student_id: student.id,
    });
    expect(row.status).toBe("active");
    expect(row.sessions_remaining).toBe(12); // refreshed from plan
    expect(new Date(row.current_period_start).getTime()).toBe(PERIOD_START * 1000);
    expect(new Date(row.current_period_end).getTime()).toBe(PERIOD_END * 1000);
  });

  it("clears pending_plan_id when the renewal price matches the pending plan", async () => {
    const { owner, student } = await seedAccountAndStudent();
    const plan = await createPlan({ classes: 12, stripe_price_id: PRICE_ID });

    // Pre-existing subscription with pending_plan_id pointing at the same plan.
    await createSubscription(student, plan, {
      status: "active",
      sessions_remaining: 0,
      pending_plan_id: plan.id,
      pending_stripe_schedule_id: "sub_sched_pending",
      pending_effective_date: new Date().toISOString(),
    } as Parameters<typeof createSubscription>[2]);

    mockSubscriptionRetrieve({
      accountId: owner.id,
      studentId: student.id,
      priceId: PRICE_ID,
    });

    const req = buildInvoicePaidRequest({
      accountId: owner.id,
      studentId: student.id,
      priceId: PRICE_ID,
    });
    await POST(req);

    const row = await expectRowExists("student_subscriptions", {
      student_id: student.id,
    });
    expect(row.pending_plan_id).toBeNull();
    expect(row.pending_stripe_schedule_id).toBeNull();
    expect(row.pending_effective_date).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SIGNATURE VERIFICATION
// ═════════════════════════════════════════════════════════════════════════════

describe("Stripe invoice.paid — signature verification", () => {
  it("returns 400 when the signature header is missing", async () => {
    nextCookies.header = "";
    const req = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify(invoicePaidFixture),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when the signature is invalid (tampered body)", async () => {
    const payload = JSON.parse(JSON.stringify(invoicePaidFixture));
    const { headers } = signWebhookPayload(payload);
    // Tamper the body AFTER signing — the verification should reject.
    const tamperedBody = JSON.stringify({ ...payload, _tampered: true });
    nextCookies.header = "";
    const req = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: tamperedBody,
      headers,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
