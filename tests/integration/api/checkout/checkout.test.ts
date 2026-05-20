/**
 * Integration tests for POST /api/checkout.
 *
 * The route has two flows:
 *   - Existing user (studentId !== "new"): requires auth, verifies ownership,
 *     blocks duplicate subscriptions, then creates a Stripe subscription.
 *   - New sign-up (studentId === "new"): no auth required, creates customer +
 *     subscription with sign-up metadata for webhook-driven account creation.
 *
 * AUDIT BUGS documented here:
 *   - Route returns 404 (not 401) for unauthenticated requests.
 *   - `console.log(password)` leaks the user's plaintext password to stdout.
 *   - Stripe subscription metadata includes `password` in plaintext.
 *
 * The checkout route creates its own `new Stripe(...)` instance inline rather
 * than importing the shared client, so Stripe is mocked via vi.hoisted() so
 * the mock is in place before the module is imported.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import {
  createAccount,
  createStudent,
  createPlan,
  createSubscription,
} from "@tests/helpers/factories";
import { signSessionFor, ANON } from "@tests/helpers/auth";
import { call } from "@tests/helpers/request";
import { server } from "@tests/helpers/msw";

// ── Stripe mock ───────────────────────────────────────────────────────────────
// vi.hoisted() runs before imports, ensuring these refs are live when the
// vi.mock factory executes (which also runs before imports are resolved).

// vi.hoisted() runs before imports — variables defined here are live when
// vi.mock factories execute, which also run before imports are resolved.
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

// Use a regular function (not arrow) — arrow functions cannot be called with `new`.
// When a constructor returns an object explicitly, `new Stripe()` returns that object.
vi.mock("stripe", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: function StripeConstructor(_key: string, _opts?: any) {
    return stripeInstance;
  },
}));

import { POST } from "@/src/app/api/checkout/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

let ownerCookies: string;
let foreignCookies: string;
let studentId: string;           // student with NO active subscription
let subscribedStudentId: string; // student with an active subscription

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "bypass" });

  const owner = await createAccount({ role: 1 });
  ownerCookies = await signSessionFor(owner);

  const foreign = await createAccount({ role: 1 });
  foreignCookies = await signSessionFor(foreign);

  const s1 = await createStudent(owner);
  studentId = s1.id;

  const s2 = await createStudent(owner);
  subscribedStudentId = s2.id;
  const plan = await createPlan({ classes: 8 });
  await createSubscription(s2, plan, { status: "active" });
});

afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Seed the Stripe mocks for a successful checkout flow. */
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

// ── Input validation ──────────────────────────────────────────────────────────

describe("POST /api/checkout — input validation", () => {
  it("returns 400 when priceId is missing", async () => {
    const res = await call(POST, {
      method: "POST",
      cookies: ownerCookies,
      body: { studentId },
    });
    expect(res.status).toBe(400);
    const body = await res.json<{ error: string }>();
    expect(body.error).toContain("Price ID");
  });
});

// ── Auth and ownership ────────────────────────────────────────────────────────

describe("POST /api/checkout — auth and ownership (existing user flow)", () => {
  it("returns 404 (not 401) when unauthenticated — auth check runs after priceId check", async () => {
    const res = await call(POST, {
      method: "POST",
      cookies: ANON.cookies,
      body: { priceId: "price_test", studentId },
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when the student belongs to a different account", async () => {
    const res = await call(POST, {
      method: "POST",
      cookies: foreignCookies,
      body: { priceId: "price_test", studentId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 409 when the student already has an active subscription", async () => {
    const res = await call(POST, {
      method: "POST",
      cookies: ownerCookies,
      body: { priceId: "price_test", studentId: subscribedStudentId },
    });
    expect(res.status).toBe(409);
    const body = await res.json<{ error: string }>();
    expect(body.error).toContain("active subscription");
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe("POST /api/checkout — happy path", () => {
  it("returns 200 with clientSecret, subscriptionId, and prefill for existing user", async () => {
    seedStripeHappyPath();
    const res = await call(POST, {
      method: "POST",
      cookies: ownerCookies,
      body: { priceId: "price_test", studentId },
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

  it("returns 200 for new sign-up flow (studentId = 'new', no auth required)", async () => {
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

// ── Security regressions ──────────────────────────────────────────────────────

describe("POST /api/checkout — security regressions (AUDIT)", () => {
  it("does not log the plaintext password to console (AUDIT: currently fails — password is logged on line 25)", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await call(POST, {
      method: "POST",
      cookies: ANON.cookies,
      body: { priceId: "price_test", password: "super_secret_abc" },
    });
    const logged = consoleSpy.mock.calls.flat();
    expect(logged).not.toContain("super_secret_abc");
  });

  it("does not store the password in Stripe subscription metadata (AUDIT: currently fails — password is in metadata)", async () => {
    seedStripeHappyPath();
    await call(POST, {
      method: "POST",
      cookies: ANON.cookies,
      body: {
        priceId: "price_test",
        studentId: "new",
        email: "new@example.com",
        password: "super_secret_abc",
      },
    });
    const createCall = mockSubscriptionsCreate.mock.calls[0]?.[0];
    expect(createCall?.metadata?.password).toBeFalsy();
  });

  it("does not expose the password in the API response", async () => {
    seedStripeHappyPath();
    const res = await call(POST, {
      method: "POST",
      cookies: ANON.cookies,
      body: {
        priceId: "price_test",
        studentId: "new",
        email: "new2@example.com",
        password: "super_secret_abc",
      },
    });
    const text = await res.json<Record<string, unknown>>();
    expect(JSON.stringify(text)).not.toContain("super_secret_abc");
  });
});
