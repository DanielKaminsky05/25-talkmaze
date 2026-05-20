/**
 * Integration tests for src/middleware.ts redirect logic.
 *
 * Middleware reads cookies directly from NextRequest (not next/headers), so
 * tests call the middleware function directly with a constructed NextRequest.
 *
 * Two layers under test:
 *   1. updateSession  — session refresh + auth-based redirects (/login ↔ /profiles)
 *   2. middleware     — RBAC routing by account.role + active-profile cookie gating
 *
 * Redirect responses:  status 307, Location header set
 * Pass-through:        status 200 (NextResponse.next())
 */
import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import {
  createAccount,
  createCoach,
  createStudent,
  createSubscription,
  createPlan,
} from "@tests/helpers/factories";
import { signSessionFor, ANON } from "@tests/helpers/auth";
import { middleware } from "@/src/middleware";

// ── Request builder ───────────────────────────────────────────────────────────

function makeReq(
  path: string,
  cookies?: string,
): NextRequest {
  const headers: Record<string, string> = {};
  if (cookies) headers["Cookie"] = cookies;
  return new NextRequest(new URL(`http://localhost:3000${path}`), { headers });
}

/** Append active_profile cookies to an existing session cookie string. */
function withProfile(
  sessionCookies: string,
  profileId: string,
  profileType: "student" | "parent",
): string {
  return `${sessionCookies}; active_profile_id=${profileId}; active_profile_type=${profileType}`;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

let regularCookies: string;
let coachCookies: string;
let adminCookies: string;
let studentId: string;
let subscribedStudentId: string;

beforeAll(async () => {
  // Regular user (role=1)
  const regular = await createAccount({ role: 1 });
  regularCookies = await signSessionFor(regular);

  // Coach (role=2)
  const { account: coachAccount } = await createCoach();
  coachCookies = await signSessionFor(coachAccount);

  // Admin (role=3)
  const admin = await createAccount({ role: 3 });
  adminCookies = await signSessionFor(admin);

  // Student with NO active subscription (for subscription gate test)
  const familyAccount = await createAccount({ role: 1 });
  const student = await createStudent(familyAccount);
  studentId = student.id;

  // Student WITH an active subscription
  const familyAccount2 = await createAccount({ role: 1 });
  const subscribedStudent = await createStudent(familyAccount2);
  subscribedStudentId = subscribedStudent.id;
  const plan = await createPlan({ classes: 8 });
  await createSubscription(subscribedStudent, plan, { status: "active" });
});

// ── Layer 1: updateSession — auth-based redirects ─────────────────────────────

describe("unauthenticated access", () => {
  it("redirects to /login when accessing a protected route", async () => {
    const res = await middleware(makeReq("/student"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("allows access to /login without a session", async () => {
    const res = await middleware(makeReq("/login"));
    expect(res.status).not.toBe(307);
  });

  it("allows access to /signup without a session", async () => {
    const res = await middleware(makeReq("/signup"));
    expect(res.status).not.toBe(307);
  });

  it("allows the root / without a session", async () => {
    const res = await middleware(makeReq("/"));
    expect(res.status).not.toBe(307);
  });

  it("bypasses auth for /api/webhooks/stripe (signature-verified instead)", async () => {
    const res = await middleware(makeReq("/api/webhooks/stripe"));
    expect(res.headers.get("location") ?? "").not.toContain("/login");
  });

  it("bypasses auth for /api/webhooks/lessonspace", async () => {
    const res = await middleware(makeReq("/api/webhooks/lessonspace"));
    expect(res.headers.get("location") ?? "").not.toContain("/login");
  });
});

describe("authenticated user on /login", () => {
  it("redirects a logged-in regular user away from /login to /profiles", async () => {
    const res = await middleware(makeReq("/login", regularCookies));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/profiles");
  });

  it("redirects a logged-in coach away from /login to /profiles", async () => {
    const res = await middleware(makeReq("/login", coachCookies));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/profiles");
  });
});

// ── Layer 2: RBAC routing by account.role ────────────────────────────────────

describe("coach (role=2) routing", () => {
  it("redirects coach from /profiles to /coach", async () => {
    const res = await middleware(makeReq("/profiles", coachCookies));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/coach");
  });

  it("allows coach to access /coach", async () => {
    const res = await middleware(makeReq("/coach", coachCookies));
    expect(res.status).not.toBe(307);
  });

  it("redirects coach away from /admin to /student", async () => {
    const res = await middleware(makeReq("/admin", coachCookies));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/student");
  });
});

describe("admin (role=3) routing", () => {
  it("redirects admin from /profiles to /admin", async () => {
    const res = await middleware(makeReq("/profiles", adminCookies));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin");
  });

  it("allows admin to access /admin", async () => {
    const res = await middleware(makeReq("/admin", adminCookies));
    expect(res.status).not.toBe(307);
  });

  it("redirects admin away from /coach to /student", async () => {
    const res = await middleware(makeReq("/coach", adminCookies));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/student");
  });
});

describe("regular user (role=1) RBAC", () => {
  it("redirects regular user away from /coach to /student", async () => {
    const cookies = withProfile(regularCookies, studentId, "student");
    const res = await middleware(makeReq("/coach", cookies));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/student");
  });

  it("redirects regular user away from /admin to /student", async () => {
    const cookies = withProfile(regularCookies, studentId, "student");
    const res = await middleware(makeReq("/admin", cookies));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/student");
  });
});

// ── Layer 2: active-profile cookie gating (regular users only) ────────────────

describe("profile cookie gating", () => {
  it("redirects to /profiles when no active_profile_id cookie is set", async () => {
    // Regular user with a valid session but no profile selected yet
    const res = await middleware(makeReq("/student", regularCookies));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/profiles");
  });

  it("allows /onboarding without an active profile (onboarding carve-out)", async () => {
    const res = await middleware(makeReq("/onboarding", regularCookies));
    // Should not redirect to /profiles even with no active_profile_id
    expect(res.headers.get("location") ?? "").not.toContain("/profiles");
  });

  it("allows /profiles itself without an active profile cookie", async () => {
    const res = await middleware(makeReq("/profiles", regularCookies));
    // Regular users hit /profiles to pick a profile — redirect goes to /coach or /admin
    // only for role 2/3. For role 1, it should pass through /profiles.
    expect(res.headers.get("location") ?? "").not.toContain("/profiles");
  });

  it("redirects student profile to /payments when no active subscription", async () => {
    const cookies = withProfile(regularCookies, studentId, "student");
    const res = await middleware(makeReq("/student", cookies));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/payments");
  });

  it("allows student with an active subscription to access /student", async () => {
    // The middleware checks student_subscriptions by student_id from the cookie,
    // not by session ownership — so any valid session + the subscribed student's
    // profile cookie should pass through.
    const cookies = withProfile(regularCookies, subscribedStudentId, "student");
    const res = await middleware(makeReq("/student", cookies));
    expect(res.headers.get("location") ?? "").not.toContain("/payments");
  });

  it("allows parent profile type to access /parent without subscription check", async () => {
    const cookies = withProfile(regularCookies, studentId, "parent");
    const res = await middleware(makeReq("/parent", cookies));
    // Parents bypass the subscription gate — should not redirect to /payments
    expect(res.headers.get("location") ?? "").not.toContain("/payments");
  });
});
