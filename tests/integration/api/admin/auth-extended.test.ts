/**
 * Auth regression tests for the remaining unprotected admin routes.
 *
 * Companion to auth.test.ts which covers: students (GET), employees (GET),
 * courses (GET/POST), create-admin, pending-bookings (GET).
 *
 * All routes here currently have NO auth — every test that expects 401 or 403
 * is RED today and turns GREEN when auth is added.
 *
 * Pattern per route:
 *   1. Unauthenticated  → 401
 *   2. Regular user     → 403
 *   3. Coach            → 403
 *   4. Admin            → 200 / success (or 404 when seed data is required)
 *
 * NOTE: create-coach already has auth (role === 3 check) — those tests pass today.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Payment-plans routes call the shared Stripe client to enrich plan data.
// Mock it so tests don't hang waiting for native-fetch Stripe calls.
vi.mock("@/src/services/stripe/client", () => ({
  stripe: {
    prices: {
      retrieve: vi.fn().mockResolvedValue({
        id: "price_test",
        unit_amount: 1000,
        currency: "usd",
        recurring: { interval: "month" },
        product: { id: "prod_test", name: "Test Product" },
      }),
    },
    products: { retrieve: vi.fn().mockResolvedValue({ id: "prod_test", name: "Test" }) },
    subscriptionSchedules: { release: vi.fn().mockResolvedValue({}) },
    subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
  },
}));
import { createClient } from "@supabase/supabase-js";
import {
  createAccount,
  createCoach,
  createStudent,
  createPlan,
  createBookedSlot,
} from "@tests/helpers/factories";
import { signSessionFor, ANON } from "@tests/helpers/auth";
import { call } from "@tests/helpers/request";
import { server } from "@tests/helpers/msw";

// ── Route handlers ─────────────────────────────────────────────────────────────

import { GET as assignmentsGET, POST as assignmentsPOST } from "@/src/app/api/admin/assignments/route";
import { DELETE as assignmentsDELETE } from "@/src/app/api/admin/assignments/[id]/route";
import { PUT as coursesPUT, DELETE as coursesDELETE } from "@/src/app/api/admin/courses/[id]/route";
import { GET as courseLessonsGET, POST as courseLessonsPOST } from "@/src/app/api/admin/courses/[id]/lessons/route";
import { PUT as lessonPUT, DELETE as lessonDELETE } from "@/src/app/api/admin/courses/[id]/lessons/[lessonId]/route";
import { POST as courseAssignPOST } from "@/src/app/api/admin/courses/assign/route";
import { POST as createCoachPOST } from "@/src/app/api/admin/create-coach/route";
import { PUT as employeePUT } from "@/src/app/api/admin/employees/[id]/route";
import { GET as employeeAvailGET, PUT as employeeAvailPUT } from "@/src/app/api/admin/employees/[id]/availability/route";
import { GET as plansGET, POST as plansPOST } from "@/src/app/api/admin/payment-plans/route";
import { PATCH as planPATCH } from "@/src/app/api/admin/payment-plans/[id]/route";
import { PATCH as planArchivePATCH } from "@/src/app/api/admin/payment-plans/[id]/archive/route";
import { GET as stripePreviewGET } from "@/src/app/api/admin/payment-plans/stripe-preview/route";
import { PATCH as bookingPATCH } from "@/src/app/api/admin/pending-bookings/[id]/route";
import { POST as bookingPreviewPOST } from "@/src/app/api/admin/pending-bookings/[id]/preview/route";
import { POST as bookingApprovePOST } from "@/src/app/api/admin/pending-bookings/[id]/approve/route";
import { PUT as studentPUT } from "@/src/app/api/admin/students/[id]/route";
import { GET as studentLessonsGET } from "@/src/app/api/admin/students/lessons/[studentId]/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

let regularCookies: string;
let coachCookies: string;
let adminCookies: string;

// Real IDs for admin happy-path tests
let courseId: string;
let lessonId: string;
let coachRowId: string;
let studentId: string;
let planId: string;
let bookingId: string;

// Placeholder for 401/403 tests — auth is checked before any DB lookup
const FAKE_ID = "00000000-0000-0000-0000-000000000099";

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "bypass" });

  // Allow GoTrue to settle after the previous test file's account-creation burst
  await new Promise((r) => setTimeout(r, 1500));

  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const regular = await createAccount({ role: 1 });
  regularCookies = await signSessionFor(regular);

  const { account: coachAccount, coach } = await createCoach();
  coachCookies = await signSessionFor(coachAccount);
  coachRowId = coach.id;

  const admin = await createAccount({ role: 3 });
  adminCookies = await signSessionFor(admin);

  const family = await createAccount({ role: 1 });
  const student = await createStudent(family);
  studentId = student.id;

  const plan = await createPlan({ classes: 8 });
  planId = plan.id;

  const booking = await createBookedSlot(coach, student, { status: "pending" });
  bookingId = booking.id;

  // Courses and lessons have no factory — insert via admin client
  const { data: course } = await adminDb
    .from("courses")
    .insert({ title: "Auth Test Course" })
    .select()
    .single();
  courseId = course!.id;

  const { data: lesson } = await adminDb
    .from("lessons")
    .insert({ course_id: courseId, title: "Auth Test Lesson", slug: `auth-lesson-${Date.now()}` })
    .select()
    .single();
  lessonId = lesson!.id;
});

afterAll(() => server.close());

// ── /api/admin/assignments ────────────────────────────────────────────────────

describe("GET /api/admin/assignments", () => {
  it("returns 401 when unauthenticated", async () => {
    expect((await call(assignmentsGET, { cookies: ANON.cookies })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(assignmentsGET, { cookies: regularCookies })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(assignmentsGET, { cookies: coachCookies })).status).toBe(403);
  });
  it("returns 200 for an admin", async () => {
    expect((await call(assignmentsGET, { cookies: adminCookies })).status).toBe(200);
  });
});

describe("POST /api/admin/assignments", () => {
  const body = { coachId: FAKE_ID, studentId: FAKE_ID };
  it("returns 401 when unauthenticated", async () => {
    expect((await call(assignmentsPOST, { method: "POST", cookies: ANON.cookies, body })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(assignmentsPOST, { method: "POST", cookies: regularCookies, body })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(assignmentsPOST, { method: "POST", cookies: coachCookies, body })).status).toBe(403);
  });
});

describe("DELETE /api/admin/assignments/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    expect((await call(assignmentsDELETE, { method: "DELETE", cookies: ANON.cookies, params: { id: FAKE_ID } })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(assignmentsDELETE, { method: "DELETE", cookies: regularCookies, params: { id: FAKE_ID } })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(assignmentsDELETE, { method: "DELETE", cookies: coachCookies, params: { id: FAKE_ID } })).status).toBe(403);
  });
});

// ── /api/admin/courses/[id] ───────────────────────────────────────────────────

describe("PUT /api/admin/courses/[id]", () => {
  const body = { course: { title: "Updated" } };
  it("returns 401 when unauthenticated", async () => {
    expect((await call(coursesPUT, { method: "PUT", cookies: ANON.cookies, params: { id: FAKE_ID }, body })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(coursesPUT, { method: "PUT", cookies: regularCookies, params: { id: FAKE_ID }, body })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(coursesPUT, { method: "PUT", cookies: coachCookies, params: { id: FAKE_ID }, body })).status).toBe(403);
  });
  it("admin gets a non-auth response (404 or 200) for a real course", async () => {
    const res = await call(coursesPUT, { method: "PUT", cookies: adminCookies, params: { id: courseId }, body });
    expect([200, 204, 404]).toContain(res.status);
  });
});

describe("DELETE /api/admin/courses/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    expect((await call(coursesDELETE, { method: "DELETE", cookies: ANON.cookies, params: { id: FAKE_ID } })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(coursesDELETE, { method: "DELETE", cookies: regularCookies, params: { id: FAKE_ID } })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(coursesDELETE, { method: "DELETE", cookies: coachCookies, params: { id: FAKE_ID } })).status).toBe(403);
  });
});

// ── /api/admin/courses/[id]/lessons ──────────────────────────────────────────

describe("GET /api/admin/courses/[id]/lessons", () => {
  it("returns 401 when unauthenticated", async () => {
    expect((await call(courseLessonsGET, { cookies: ANON.cookies, params: { id: FAKE_ID } })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(courseLessonsGET, { cookies: regularCookies, params: { id: FAKE_ID } })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(courseLessonsGET, { cookies: coachCookies, params: { id: FAKE_ID } })).status).toBe(403);
  });
  it("returns 200 for an admin", async () => {
    expect((await call(courseLessonsGET, { cookies: adminCookies, params: { id: courseId } })).status).toBe(200);
  });
});

describe("POST /api/admin/courses/[id]/lessons", () => {
  const body = { title: "New Lesson", slug: `new-lesson-${Date.now()}` };
  it("returns 401 when unauthenticated", async () => {
    expect((await call(courseLessonsPOST, { method: "POST", cookies: ANON.cookies, params: { id: FAKE_ID }, body })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(courseLessonsPOST, { method: "POST", cookies: regularCookies, params: { id: FAKE_ID }, body })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(courseLessonsPOST, { method: "POST", cookies: coachCookies, params: { id: FAKE_ID }, body })).status).toBe(403);
  });
});

// ── /api/admin/courses/[id]/lessons/[lessonId] ────────────────────────────────

describe("PUT /api/admin/courses/[id]/lessons/[lessonId]", () => {
  const body = { title: "Updated Lesson" };
  it("returns 401 when unauthenticated", async () => {
    expect((await call(lessonPUT, { method: "PUT", cookies: ANON.cookies, params: { id: FAKE_ID, lessonId: FAKE_ID }, body })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(lessonPUT, { method: "PUT", cookies: regularCookies, params: { id: FAKE_ID, lessonId: FAKE_ID }, body })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(lessonPUT, { method: "PUT", cookies: coachCookies, params: { id: FAKE_ID, lessonId: FAKE_ID }, body })).status).toBe(403);
  });
});

describe("DELETE /api/admin/courses/[id]/lessons/[lessonId]", () => {
  it("returns 401 when unauthenticated", async () => {
    expect((await call(lessonDELETE, { method: "DELETE", cookies: ANON.cookies, params: { id: FAKE_ID, lessonId: FAKE_ID } })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(lessonDELETE, { method: "DELETE", cookies: regularCookies, params: { id: FAKE_ID, lessonId: FAKE_ID } })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(lessonDELETE, { method: "DELETE", cookies: coachCookies, params: { id: FAKE_ID, lessonId: FAKE_ID } })).status).toBe(403);
  });
});

// ── /api/admin/courses/assign ─────────────────────────────────────────────────

describe("POST /api/admin/courses/assign", () => {
  const body = { studentId: FAKE_ID, courseId: FAKE_ID };
  it("returns 401 when unauthenticated", async () => {
    expect((await call(courseAssignPOST, { method: "POST", cookies: ANON.cookies, body })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(courseAssignPOST, { method: "POST", cookies: regularCookies, body })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(courseAssignPOST, { method: "POST", cookies: coachCookies, body })).status).toBe(403);
  });
});

// ── /api/admin/create-coach (already has auth — tests should pass today) ──────

describe("POST /api/admin/create-coach", () => {
  const body = { email: `coach-${Date.now()}@test.com`, password: "Password123!", firstName: "New", lastName: "Coach" };
  it("returns 401 when unauthenticated", async () => {
    expect((await call(createCoachPOST, { method: "POST", cookies: ANON.cookies, body })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(createCoachPOST, { method: "POST", cookies: regularCookies, body })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(createCoachPOST, { method: "POST", cookies: coachCookies, body })).status).toBe(403);
  });
  it("returns 200 for an admin", async () => {
    const uniqueBody = { ...body, email: `coach-${Date.now()}-2@test.com` };
    expect((await call(createCoachPOST, { method: "POST", cookies: adminCookies, body: uniqueBody })).status).toBe(200);
  });
});

// ── /api/admin/employees/[id] ─────────────────────────────────────────────────

describe("PUT /api/admin/employees/[id]", () => {
  const body = { employee: { first_name: "Updated", last_name: "Coach" } };
  it("returns 401 when unauthenticated", async () => {
    expect((await call(employeePUT, { method: "PUT", cookies: ANON.cookies, params: { id: FAKE_ID }, body })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(employeePUT, { method: "PUT", cookies: regularCookies, params: { id: FAKE_ID }, body })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(employeePUT, { method: "PUT", cookies: coachCookies, params: { id: FAKE_ID }, body })).status).toBe(403);
  });
  it("admin gets a non-auth response for a real employee", async () => {
    const res = await call(employeePUT, { method: "PUT", cookies: adminCookies, params: { id: coachRowId }, body });
    expect([200, 204, 404]).toContain(res.status);
  });
});

// ── /api/admin/employees/[id]/availability ────────────────────────────────────

describe("GET /api/admin/employees/[id]/availability", () => {
  it("returns 401 when unauthenticated", async () => {
    expect((await call(employeeAvailGET, { cookies: ANON.cookies, params: { id: FAKE_ID } })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(employeeAvailGET, { cookies: regularCookies, params: { id: FAKE_ID } })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(employeeAvailGET, { cookies: coachCookies, params: { id: FAKE_ID } })).status).toBe(403);
  });
  it("returns 200 for an admin", async () => {
    expect((await call(employeeAvailGET, { cookies: adminCookies, params: { id: coachRowId } })).status).toBe(200);
  });
});

describe("PUT /api/admin/employees/[id]/availability", () => {
  const body = { weekday: 1, start_time: "09:00", end_time: "17:00", timezone: "America/New_York" };
  it("returns 401 when unauthenticated", async () => {
    expect((await call(employeeAvailPUT, { method: "PUT", cookies: ANON.cookies, params: { id: FAKE_ID }, body })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(employeeAvailPUT, { method: "PUT", cookies: regularCookies, params: { id: FAKE_ID }, body })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(employeeAvailPUT, { method: "PUT", cookies: coachCookies, params: { id: FAKE_ID }, body })).status).toBe(403);
  });
});

// ── /api/admin/payment-plans ──────────────────────────────────────────────────

describe("GET /api/admin/payment-plans", () => {
  it("returns 401 when unauthenticated", async () => {
    expect((await call(plansGET, { cookies: ANON.cookies })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(plansGET, { cookies: regularCookies })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(plansGET, { cookies: coachCookies })).status).toBe(403);
  });
  it("returns 200 for an admin", async () => {
    expect((await call(plansGET, { cookies: adminCookies })).status).toBe(200);
  });
});

describe("POST /api/admin/payment-plans", () => {
  const body = { name: "Test Plan", classes: 8, cents: 9900, currency: "usd", renewal: "monthly", stripe_price_id: `price_test_${Date.now()}` };
  it("returns 401 when unauthenticated", async () => {
    expect((await call(plansPOST, { method: "POST", cookies: ANON.cookies, body })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(plansPOST, { method: "POST", cookies: regularCookies, body })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(plansPOST, { method: "POST", cookies: coachCookies, body })).status).toBe(403);
  });
});

describe("PATCH /api/admin/payment-plans/[id]", () => {
  const body = { name: "Updated Plan" };
  it("returns 401 when unauthenticated", async () => {
    expect((await call(planPATCH, { method: "PATCH", cookies: ANON.cookies, params: { id: FAKE_ID }, body })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(planPATCH, { method: "PATCH", cookies: regularCookies, params: { id: FAKE_ID }, body })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(planPATCH, { method: "PATCH", cookies: coachCookies, params: { id: FAKE_ID }, body })).status).toBe(403);
  });
  it("admin gets a non-auth response for a real plan", async () => {
    const res = await call(planPATCH, { method: "PATCH", cookies: adminCookies, params: { id: planId }, body });
    expect([200, 204, 404]).toContain(res.status);
  });
});

describe("PATCH /api/admin/payment-plans/[id]/archive", () => {
  it("returns 401 when unauthenticated", async () => {
    expect((await call(planArchivePATCH, { method: "PATCH", cookies: ANON.cookies, params: { id: FAKE_ID } })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(planArchivePATCH, { method: "PATCH", cookies: regularCookies, params: { id: FAKE_ID } })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(planArchivePATCH, { method: "PATCH", cookies: coachCookies, params: { id: FAKE_ID } })).status).toBe(403);
  });
  it("admin gets a non-auth response for a real plan", async () => {
    const res = await call(planArchivePATCH, { method: "PATCH", cookies: adminCookies, params: { id: planId } });
    expect([200, 204, 404]).toContain(res.status);
  });
});

describe("GET /api/admin/payment-plans/stripe-preview", () => {
  it("returns 401 when unauthenticated", async () => {
    expect((await call(stripePreviewGET, { cookies: ANON.cookies, query: { priceId: "price_test" } })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(stripePreviewGET, { cookies: regularCookies, query: { priceId: "price_test" } })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(stripePreviewGET, { cookies: coachCookies, query: { priceId: "price_test" } })).status).toBe(403);
  });
});

// ── /api/admin/pending-bookings/[id] ─────────────────────────────────────────

describe("PATCH /api/admin/pending-bookings/[id]", () => {
  const body = { weekday: 1, start_time: "10:00", end_time: "11:00", timezone: "America/New_York" };
  it("returns 401 when unauthenticated", async () => {
    expect((await call(bookingPATCH, { method: "PATCH", cookies: ANON.cookies, params: { id: FAKE_ID }, body })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(bookingPATCH, { method: "PATCH", cookies: regularCookies, params: { id: FAKE_ID }, body })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(bookingPATCH, { method: "PATCH", cookies: coachCookies, params: { id: FAKE_ID }, body })).status).toBe(403);
  });
});

describe("POST /api/admin/pending-bookings/[id]/preview", () => {
  it("returns 401 when unauthenticated", async () => {
    expect((await call(bookingPreviewPOST, { method: "POST", cookies: ANON.cookies, params: { id: FAKE_ID } })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(bookingPreviewPOST, { method: "POST", cookies: regularCookies, params: { id: FAKE_ID } })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(bookingPreviewPOST, { method: "POST", cookies: coachCookies, params: { id: FAKE_ID } })).status).toBe(403);
  });
  it("admin gets a non-auth response for a real booking", async () => {
    // Route calls req.json() — must send a body or it throws before returning
    const body = { coach_id: FAKE_ID, weekday: 1, start_time: "10:00", end_time: "11:00", timezone: "America/New_York", num_sessions: 8, start_date: "2025-01-01" };
    const res = await call(bookingPreviewPOST, { method: "POST", cookies: adminCookies, params: { id: bookingId }, body });
    expect([200, 201, 400, 404, 500]).toContain(res.status);
  });
});

describe("POST /api/admin/pending-bookings/[id]/approve", () => {
  it("returns 401 when unauthenticated", async () => {
    expect((await call(bookingApprovePOST, { method: "POST", cookies: ANON.cookies, params: { id: FAKE_ID } })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(bookingApprovePOST, { method: "POST", cookies: regularCookies, params: { id: FAKE_ID } })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(bookingApprovePOST, { method: "POST", cookies: coachCookies, params: { id: FAKE_ID } })).status).toBe(403);
  });
  it("admin gets a non-auth response for a real booking", async () => {
    const res = await call(bookingApprovePOST, { method: "POST", cookies: adminCookies, params: { id: bookingId } });
    expect([200, 201, 404, 500]).toContain(res.status);
  });
});

// ── /api/admin/students/[id] ──────────────────────────────────────────────────

describe("PUT /api/admin/students/[id]", () => {
  const body = { student: { first_name: "Updated", last_name: "Student" } };
  it("returns 401 when unauthenticated", async () => {
    expect((await call(studentPUT, { method: "PUT", cookies: ANON.cookies, params: { id: FAKE_ID }, body })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(studentPUT, { method: "PUT", cookies: regularCookies, params: { id: FAKE_ID }, body })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(studentPUT, { method: "PUT", cookies: coachCookies, params: { id: FAKE_ID }, body })).status).toBe(403);
  });
  it("admin gets a non-auth response for a real student", async () => {
    const res = await call(studentPUT, { method: "PUT", cookies: adminCookies, params: { id: studentId }, body });
    expect([200, 204, 404]).toContain(res.status);
  });
});

// ── /api/admin/students/lessons/[studentId] ───────────────────────────────────

describe("GET /api/admin/students/lessons/[studentId]", () => {
  it("returns 401 when unauthenticated", async () => {
    expect((await call(studentLessonsGET, { cookies: ANON.cookies, params: { studentId: FAKE_ID } })).status).toBe(401);
  });
  it("returns 403 for a regular user", async () => {
    expect((await call(studentLessonsGET, { cookies: regularCookies, params: { studentId: FAKE_ID } })).status).toBe(403);
  });
  it("returns 403 for a coach", async () => {
    expect((await call(studentLessonsGET, { cookies: coachCookies, params: { studentId: FAKE_ID } })).status).toBe(403);
  });
  it("returns 200 for an admin", async () => {
    expect((await call(studentLessonsGET, { cookies: adminCookies, params: { studentId } })).status).toBe(200);
  });
});
