/**
 * Regression tests for the admin API auth holes documented in repo-quality-audit.md.
 *
 * EXPECTED STATE TODAY: most tests are RED.
 * The routes currently have no authentication — they return 200 to everyone.
 * Each test documents the INTENDED behaviour; they turn green as fixes land.
 *
 * Pattern per route:
 *   1. Unauthenticated  → 401
 *   2. Regular user     → 403
 *   3. Coach            → 403
 *   4. Admin            → 200 (or appropriate success code)
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { createAccount, createCoach } from "@tests/helpers/factories";
import { signSessionFor, ANON } from "@tests/helpers/auth";
import { resetDb } from "@tests/helpers/db";

// Route handlers
import { GET as studentsGET } from "@/src/app/api/admin/students/route";
import { GET as employeesGET } from "@/src/app/api/admin/employees/route";
import { GET as coursesGET, POST as coursesPOST } from "@/src/app/api/admin/courses/route";
import { POST as createAdminPOST } from "@/src/app/api/admin/create-admin/route";
import { GET as pendingGET } from "@/src/app/api/admin/pending-bookings/route";
import { call } from "@tests/helpers/request";

// ── Test accounts shared across all tests in this file ───────────────────────

let anonCookies: string;
let regularCookies: string;
let coachCookies: string;
let adminCookies: string;

beforeAll(async () => {
  const regular = await createAccount({ role: 1 });
  const { account: coachAccount } = await createCoach();
  const admin = await createAccount({ role: 3 });

  anonCookies = ANON.cookies;
  regularCookies = await signSessionFor(regular);
  coachCookies = await signSessionFor(coachAccount);
  adminCookies = await signSessionFor(admin);
});

beforeEach(async () => {
  // Do NOT reset DB per test here — shared accounts were created in beforeAll.
  // Individual tests that need fresh DB rows can insert via factories.
});

// ── /api/admin/students ───────────────────────────────────────────────────────

describe("GET /api/admin/students", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await call(studentsGET, { cookies: anonCookies });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular user (role=1)", async () => {
    const res = await call(studentsGET, { cookies: regularCookies });
    expect(res.status).toBe(403);
  });

  it("returns 403 for a coach (role=2)", async () => {
    const res = await call(studentsGET, { cookies: coachCookies });
    expect(res.status).toBe(403);
  });

  it("returns 200 for an admin (role=3)", async () => {
    const res = await call(studentsGET, { cookies: adminCookies });
    expect(res.status).toBe(200);
  });
});

// ── /api/admin/employees ──────────────────────────────────────────────────────

describe("GET /api/admin/employees", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await call(employeesGET, { cookies: anonCookies });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular user", async () => {
    const res = await call(employeesGET, { cookies: regularCookies });
    expect(res.status).toBe(403);
  });

  it("returns 403 for a coach", async () => {
    const res = await call(employeesGET, { cookies: coachCookies });
    expect(res.status).toBe(403);
  });

  it("returns 200 for an admin", async () => {
    const res = await call(employeesGET, { cookies: adminCookies });
    expect(res.status).toBe(200);
  });
});

// ── /api/admin/courses ────────────────────────────────────────────────────────

describe("GET /api/admin/courses", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await call(coursesGET, { cookies: anonCookies });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular user", async () => {
    const res = await call(coursesGET, { cookies: regularCookies });
    expect(res.status).toBe(403);
  });

  it("returns 403 for a coach", async () => {
    const res = await call(coursesGET, { cookies: coachCookies });
    expect(res.status).toBe(403);
  });

  it("returns 200 for an admin", async () => {
    const res = await call(coursesGET, { cookies: adminCookies });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/admin/courses — requires valid body", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await call(coursesPOST, {
      method: "POST",
      cookies: anonCookies,
      body: { course: { title: "Test" } },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular user", async () => {
    const res = await call(coursesPOST, {
      method: "POST",
      cookies: regularCookies,
      body: { course: { title: "Test" } },
    });
    expect(res.status).toBe(403);
  });
});

// ── /api/admin/create-admin (CRITICAL: RBAC check commented out) ──────────────

describe("POST /api/admin/create-admin", () => {
  const body = {
    email: "newadmin@test.com",
    password: "Password123!",
    firstName: "New",
    lastName: "Admin",
  };

  it("returns 401 when unauthenticated", async () => {
    const res = await call(createAdminPOST, {
      method: "POST",
      cookies: anonCookies,
      body,
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular user (AUDIT: RBAC check currently commented out)", async () => {
    // This test documents the CRITICAL bug: the role check is commented out.
    // Currently returns 200. Should return 403.
    const res = await call(createAdminPOST, {
      method: "POST",
      cookies: regularCookies,
      body,
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 for a coach", async () => {
    const res = await call(createAdminPOST, {
      method: "POST",
      cookies: coachCookies,
      body,
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 for an admin", async () => {
    const uniqueBody = { ...body, email: `admin-${Date.now()}@test.com` };
    const res = await call(createAdminPOST, {
      method: "POST",
      cookies: adminCookies,
      body: uniqueBody,
    });
    expect(res.status).toBe(200);
  });
});

// ── /api/admin/pending-bookings (also bypasses RLS via service role) ──────────

describe("GET /api/admin/pending-bookings", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await call(pendingGET, { cookies: anonCookies });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular user", async () => {
    const res = await call(pendingGET, { cookies: regularCookies });
    expect(res.status).toBe(403);
  });

  it("returns 403 for a coach", async () => {
    const res = await call(pendingGET, { cookies: coachCookies });
    expect(res.status).toBe(403);
  });

  it("returns 200 for an admin", async () => {
    const res = await call(pendingGET, { cookies: adminCookies });
    expect(res.status).toBe(200);
  });
});
