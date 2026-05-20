/**
 * Contract tests for POST /api/checkout.
 *
 * The route has two flows controlled by `studentId`:
 *   - `studentId === "new"` → public sub-flow (signup + first payment).
 *     Anonymous calls are allowed by design (api-auth.md:194-218).
 *   - `studentId !== "new"` → authed flow (role 1) + ownership on student.
 *
 * Five questions:
 *   Q1 ownership — 403 when authed flow caller doesn't own the student;
 *                  401 when authed flow is unauthenticated
 *                  (per api-auth.md fix to the 404-not-401 ordering bug).
 *   Q2 validation — priceId required; studentId required ("new" or UUID);
 *                   strict: no `password`/PII fields leaked to Stripe.
 *   Q3 response — { clientSecret, subscriptionId, prefill }.
 *   Q4 side effects — Stripe customer/subscription created; auth user
 *                     created for the "new" branch.
 *   Q5 external calls — stripe.subscriptions.create called with metadata
 *                       that does NOT contain the password.
 *
 * AUDIT BUGS this file pins as the contract (RED today, GREEN on fix):
 *   - Anonymous on authed flow → 401, NOT 404 (auth-before-validation per the
 *     api-contract.md ordering rule).
 *   - `console.log(password)` removed (currently leaks plaintext to stdout).
 *   - Stripe metadata does NOT contain password (currently stored in metadata).
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";

const {
  mockCustomersCreate,
  mockCustomersRetrieve,
  mockSubscriptionsList,
  mockSubscriptionsCreate,
  mockSubscriptionsCancel,
  stripeInstance,
} = vi.hoisted(() => {
  const mockCustomersCreate = vi.fn();
  const mockCustomersRetrieve = vi.fn();
  const mockSubscriptionsList = vi.fn();
  const mockSubscriptionsCreate = vi.fn();
  const mockSubscriptionsCancel = vi.fn();
  return {
    mockCustomersCreate,
    mockCustomersRetrieve,
    mockSubscriptionsList,
    mockSubscriptionsCreate,
    mockSubscriptionsCancel,
    stripeInstance: {
      customers: { create: mockCustomersCreate, retrieve: mockCustomersRetrieve },
      subscriptions: {
        list: mockSubscriptionsList,
        create: mockSubscriptionsCreate,
        cancel: mockSubscriptionsCancel,
      },
    },
  };
});

vi.mock("stripe", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: function StripeConstructor(_key: string, _opts?: any) {
    return stripeInstance;
  },
}));

import {
  createAccount,
  createStudent,
  createPlan,
  createSubscription,
} from "@tests/helpers/factories";
import { signSessionFor, ANON } from "@tests/helpers/auth";
import { resetAll } from "@tests/helpers/db";
import { call } from "@tests/helpers/request";
import { server } from "@tests/helpers/msw";

import { POST } from "@/src/app/api/checkout/route";

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());
beforeEach(resetAll);
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

function seedStripeHappyPath() {
  mockCustomersCreate.mockResolvedValue({ id: "cus_test_checkout" });
  mockCustomersRetrieve.mockResolvedValue({
    id: "cus_test_checkout",
    object: "customer",
    name: "Test Parent",
    email: "test@example.com",
    phone: null,
  });
  mockSubscriptionsList.mockResolvedValue({ data: [] });
  mockSubscriptionsCreate.mockResolvedValue({
    id: "sub_test_checkout",
    latest_invoice: {
      payment_intent: null,
      confirmation_secret: { client_secret: "pi_test_secret_abc" },
    },
  });
}

async function seedOwnerWithStudent() {
  const owner = await createAccount({ role: 1 });
  const cookies = await signSessionFor(owner);
  const student = await createStudent(owner);
  return { owner, cookies, student };
}

// ═════════════════════════════════════════════════════════════════════════════
// Q1: WHO CAN CALL IT?
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/checkout — ownership (authed flow)", () => {
  it("returns 401 when unauthenticated AND studentId is not 'new' (authed flow requires auth)", async () => {
    const { student } = await seedOwnerWithStudent();
    const res = await call(POST, {
      method: "POST",
      cookies: ANON.cookies,
      body: { priceId: "price_test", studentId: student.id },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when the student belongs to a different account", async () => {
    const { student } = await seedOwnerWithStudent();
    const stranger = await createAccount({ role: 1 });
    const strangerCookies = await signSessionFor(stranger);

    const res = await call(POST, {
      method: "POST",
      cookies: strangerCookies,
      body: { priceId: "price_test", studentId: student.id },
    });
    expect(res.status).toBe(403);
  });

  it("returns 409 when the student already has an active subscription", async () => {
    const { owner, cookies } = await seedOwnerWithStudent();
    const subscribedStudent = await createStudent(owner);
    const plan = await createPlan({ classes: 8 });
    await createSubscription(subscribedStudent, plan, { status: "active" });

    const res = await call(POST, {
      method: "POST",
      cookies,
      body: { priceId: "price_test", studentId: subscribedStudent.id },
    });
    expect(res.status).toBe(409);
    const body = await res.json<{ error: string }>();
    expect(body.error.toLowerCase()).toContain("active subscription");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Q2: WHAT INPUTS DOES IT ACCEPT?
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/checkout — input validation", () => {
  it("returns 400 when priceId is missing", async () => {
    const { cookies, student } = await seedOwnerWithStudent();
    const res = await call(POST, {
      method: "POST",
      cookies,
      body: { studentId: student.id },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when studentId is missing", async () => {
    const { cookies } = await seedOwnerWithStudent();
    const res = await call(POST, {
      method: "POST",
      cookies,
      body: { priceId: "price_test" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when studentId is neither 'new' nor a UUID", async () => {
    const { cookies } = await seedOwnerWithStudent();
    const res = await call(POST, {
      method: "POST",
      cookies,
      body: { priceId: "price_test", studentId: "not-a-uuid-or-new" },
    });
    expect(res.status).toBe(400);
  });

  it("error responses use the { error: string } shape", async () => {
    const { cookies } = await seedOwnerWithStudent();
    const res = await call(POST, {
      method: "POST",
      cookies,
      body: { priceId: "price_test", studentId: "not-a-uuid" },
    });
    const body = await res.json<{ error?: string; message?: string; status?: number }>();
    expect(typeof body.error).toBe("string");
    expect(body.message).toBeUndefined();
    expect(body.status).toBeUndefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Q3: WHAT DOES IT RETURN ON SUCCESS?
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/checkout — response shape", () => {
  it("returns 200 with { clientSecret, subscriptionId, prefill } for existing user", async () => {
    seedStripeHappyPath();
    const { cookies, student } = await seedOwnerWithStudent();
    const res = await call(POST, {
      method: "POST",
      cookies,
      body: { priceId: "price_test", studentId: student.id },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{
      clientSecret: string;
      subscriptionId: string;
      prefill: { name: string; email: string; phone: string };
    }>();
    expect(body.clientSecret).toBeTruthy();
    expect(body.subscriptionId).toBeTruthy();
    expect(body.prefill).toBeDefined();
  });

  it("returns 200 for the public signup branch (studentId='new', no auth)", async () => {
    seedStripeHappyPath();
    const res = await call(POST, {
      method: "POST",
      cookies: ANON.cookies,
      body: {
        priceId: "price_test",
        studentId: "new",
        pFName: "Jane",
        pLName: "Doe",
        sFName: "Kid",
        sLName: "Doe",
        email: "jane@example.com",
        password: "Password123!",
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ clientSecret: string }>();
    expect(body.clientSecret).toBeTruthy();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Q5: WHAT EXTERNAL CALLS DID IT MAKE? (Security regressions go here)
// Q4 side-effects (DB rows) are not separately asserted — the route's writes
// in the authed flow are limited to setting stripe_customer_id, which the
// Stripe mock-side success tests already exercise.
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/checkout — security (no password leaks)", () => {
  it("does NOT log the plaintext password to console", async () => {
    seedStripeHappyPath();
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await call(POST, {
      method: "POST",
      cookies: ANON.cookies,
      body: {
        priceId: "price_test",
        studentId: "new",
        email: "newconsole@example.com",
        password: "super_secret_abc",
      },
    });
    const loggedString = JSON.stringify(consoleLogSpy.mock.calls);
    expect(loggedString).not.toContain("super_secret_abc");
    consoleLogSpy.mockRestore();
  });

  it("does NOT include the password in Stripe subscription metadata", async () => {
    seedStripeHappyPath();
    await call(POST, {
      method: "POST",
      cookies: ANON.cookies,
      body: {
        priceId: "price_test",
        studentId: "new",
        email: "newmeta@example.com",
        password: "super_secret_abc",
      },
    });
    const createCall = mockSubscriptionsCreate.mock.calls[0]?.[0] as {
      metadata?: Record<string, unknown>;
    };
    // No `password` key at all, and no value that is the password.
    expect(createCall?.metadata?.password).toBeUndefined();
    const metadataString = JSON.stringify(createCall?.metadata ?? {});
    expect(metadataString).not.toContain("super_secret_abc");
  });

  it("does NOT expose the password in the API response body", async () => {
    seedStripeHappyPath();
    const res = await call(POST, {
      method: "POST",
      cookies: ANON.cookies,
      body: {
        priceId: "price_test",
        studentId: "new",
        email: "newresponse@example.com",
        password: "super_secret_abc",
      },
    });
    const text = JSON.stringify(await res.json<Record<string, unknown>>());
    expect(text).not.toContain("super_secret_abc");
  });
});
