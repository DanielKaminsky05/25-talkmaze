/**
 * Regression tests for coach routes that authenticate the caller but don't
 * verify the caller is the coach assigned to the student they're acting on.
 *
 * The key bug: lesson-feedback and lesson-progress accept any authenticated
 * user (not even coach-only) and trust whatever student_id is in the body.
 * Any family account or unassigned coach can overwrite another student's data.
 *
 * EXPECTED STATE TODAY:
 *   - Regular user calling coach routes → should be 403, currently 200/success
 *   - Wrong coach acting on a student   → should be 403, currently 200/success
 *   - Correct coach acting on own student → 200 ✓ (already works)
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";
import {
  createAccount,
  createCoach,
  createStudent,
  createParent,
  linkCoachToStudent,
} from "@tests/helpers/factories";
import { signSessionFor, ANON } from "@tests/helpers/auth";
import { call } from "@tests/helpers/request";
import { server } from "@tests/helpers/msw";
import { createClient } from "@supabase/supabase-js";

import { PATCH as feedbackPATCH } from "@/src/app/api/coach/lesson-feedback/route";
import { PATCH as progressPATCH } from "@/src/app/api/coach/lesson-progress/route";
import { GET as lessonsGET } from "@/src/app/api/coach/lessons/route";
import { GET as sessionsGET } from "@/src/app/api/coach/sessions/route";
import { GET as conversationGET } from "@/src/app/api/coach/conversation/route";
import { GET as conversationMsgGET } from "@/src/app/api/coach/conversation/message/route";

// ── Shared fixtures ───────────────────────────────────────────────────────────

let ownerCoachCookies: string;
let otherCoachCookies: string;
let regularCookies: string;
let assignedStudentId: string;
let foreignStudentId: string;
let lessonId: string;
let courseId: string;
let ownConversationId: string;
let foreignConversationId: string;

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "bypass" });

  // Primary coach + their assigned student
  const { account: ownerAccount, coach: ownerCoach } = await createCoach();
  const familyAccount = await createAccount({ role: 1 });
  const assignedStudent = await createStudent(familyAccount);
  assignedStudentId = assignedStudent.id;
  await linkCoachToStudent(ownerCoach, assignedStudent);
  ownerCoachCookies = await signSessionFor(ownerAccount);

  // A second coach with their own separate student (not linked to ownerCoach)
  const { account: otherAccount, coach: otherCoach } = await createCoach();
  const otherFamily = await createAccount({ role: 1 });
  const foreignStudent = await createStudent(otherFamily);
  foreignStudentId = foreignStudent.id;
  await linkCoachToStudent(otherCoach, foreignStudent);
  otherCoachCookies = await signSessionFor(otherAccount);

  // Regular family user — shouldn't be able to call coach endpoints
  const regular = await createAccount({ role: 1 });
  await createParent(regular);
  regularCookies = await signSessionFor(regular);

  // Seed a course + lesson for lesson-feedback / lesson-progress tests
  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: course } = await adminDb
    .from("courses")
    .insert({ title: "Test Course" })
    .select()
    .single();
  courseId = course!.id;

  const { data: lesson } = await adminDb
    .from("lessons")
    .insert({ course_id: courseId, title: "Lesson 1", slug: "lesson-1" })
    .select()
    .single();
  lessonId = lesson!.id;

  // Seed a conversation that belongs to ownerCoach + assignedStudent
  const { data: ownConv } = await adminDb
    .from("conversations")
    .insert({
      coach_id: ownerCoach.id,
      profile_id: assignedStudentId,
      profile_type: "student",
    })
    .select()
    .single();
  ownConversationId = ownConv!.id;

  // Seed a conversation that belongs to otherCoach + foreignStudent
  const { data: foreignConv } = await adminDb
    .from("conversations")
    .insert({
      coach_id: otherCoach.id,
      profile_id: foreignStudentId,
      profile_type: "student",
    })
    .select()
    .single();
  foreignConversationId = foreignConv!.id;
});

afterAll(() => server.close());
afterEach(() => server.resetHandlers());

// ── PATCH /api/coach/lesson-feedback ─────────────────────────────────────────

describe("PATCH /api/coach/lesson-feedback", () => {
  const body = {
    student_id: "", // filled per test
    lesson_id: "",
    positive_feedback: "<p>Great work</p>",
    improvement_feedback: "<p>Keep going</p>",
  };

  it("returns 401 when unauthenticated", async () => {
    const res = await call(feedbackPATCH, {
      method: "PATCH",
      cookies: ANON.cookies,
      body: { ...body, student_id: assignedStudentId, lesson_id: lessonId },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular family user (AUDIT: any authenticated user can write feedback)", async () => {
    const res = await call(feedbackPATCH, {
      method: "PATCH",
      cookies: regularCookies,
      body: { ...body, student_id: assignedStudentId, lesson_id: lessonId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when a coach writes feedback for a student they don't own (AUDIT: currently 200)", async () => {
    const res = await call(feedbackPATCH, {
      method: "PATCH",
      cookies: otherCoachCookies,
      body: { ...body, student_id: assignedStudentId, lesson_id: lessonId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 when the assigned coach writes feedback for their own student", async () => {
    const res = await call(feedbackPATCH, {
      method: "PATCH",
      cookies: ownerCoachCookies,
      body: { ...body, student_id: assignedStudentId, lesson_id: lessonId },
    });
    expect(res.status).toBe(200);
  });
});

// ── PATCH /api/coach/lesson-progress ─────────────────────────────────────────

describe("PATCH /api/coach/lesson-progress", () => {
  const body = { student_id: "", lesson_id: "", status: 2 };

  it("returns 401 when unauthenticated", async () => {
    const res = await call(progressPATCH, {
      method: "PATCH",
      cookies: ANON.cookies,
      body: { ...body, student_id: assignedStudentId, lesson_id: lessonId },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular family user (AUDIT: any authenticated user can update progress)", async () => {
    const res = await call(progressPATCH, {
      method: "PATCH",
      cookies: regularCookies,
      body: { ...body, student_id: assignedStudentId, lesson_id: lessonId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when a coach updates progress for a student they don't own (AUDIT: currently 200)", async () => {
    const res = await call(progressPATCH, {
      method: "PATCH",
      cookies: otherCoachCookies,
      body: { ...body, student_id: assignedStudentId, lesson_id: lessonId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 when the assigned coach updates progress for their own student", async () => {
    const res = await call(progressPATCH, {
      method: "PATCH",
      cookies: ownerCoachCookies,
      body: { ...body, student_id: assignedStudentId, lesson_id: lessonId },
    });
    expect(res.status).toBe(200);
  });
});

// ── GET /api/coach/lessons?studentId= ────────────────────────────────────────

describe("GET /api/coach/lessons with studentId param", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await call(lessonsGET, {
      cookies: ANON.cookies,
      query: { studentId: assignedStudentId },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular user requesting a student's progress (AUDIT: currently 200)", async () => {
    const res = await call(lessonsGET, {
      cookies: regularCookies,
      query: { studentId: assignedStudentId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when a coach requests progress for a student they don't own (AUDIT: currently 200)", async () => {
    const res = await call(lessonsGET, {
      cookies: otherCoachCookies,
      query: { studentId: assignedStudentId },
    });
    expect(res.status).toBe(403);
  });

  it.todo(
    "returns 200 for the assigned coach — blocked by pre-existing PGRST201 bug: " +
      "lessons.select('courses(...)') is ambiguous because courses has multiple FKs " +
      "to lessons (head_lesson_id, tail_lesson_id, course_id). Fix the query to use " +
      "an explicit hint e.g. courses!lessons_course_id_fkey(id, title) then enable this.",
  );

  it.todo(
    "returns 200 with no studentId — same PGRST201 blocker as above",
  );
});

// ── GET /api/coach/sessions ───────────────────────────────────────────────────
// Sessions are already coach-scoped (filtered by coach_id). The route is
// reasonably safe but should reject non-coaches cleanly.

describe("GET /api/coach/sessions", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await call(sessionsGET, { cookies: ANON.cookies });
    expect(res.status).toBe(401);
  });

  it("returns 404 for a regular user (not a coach — no coaches row)", async () => {
    const res = await call(sessionsGET, { cookies: regularCookies });
    expect(res.status).toBe(404);
  });

  it("returns 200 for a coach (filtered to their own sessions)", async () => {
    const res = await call(sessionsGET, { cookies: ownerCoachCookies });
    expect(res.status).toBe(200);
  });

  it("does not leak the other coach's sessions when student_id filter is applied", async () => {
    // foreignStudentId belongs to otherCoach, not ownerCoach.
    // ownerCoach should get an empty list, not 403 — the route scopes by coach_id.
    const res = await call(sessionsGET, {
      cookies: ownerCoachCookies,
      query: { student_id: foreignStudentId },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ sessions: unknown[] }>();
    expect(body.sessions).toHaveLength(0); // no cross-coach leakage
  });
});

// ── GET /api/coach/conversation?contactId= ───────────────────────────────────

describe("GET /api/coach/conversation", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await call(conversationGET, {
      cookies: ANON.cookies,
      query: { contactId: assignedStudentId },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular user (not a coach)", async () => {
    const res = await call(conversationGET, {
      cookies: regularCookies,
      query: { contactId: assignedStudentId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when a coach tries to initiate a conversation with a student they don't own (AUDIT: currently 200)", async () => {
    // otherCoach should not be able to message ownerCoach's student
    const res = await call(conversationGET, {
      cookies: otherCoachCookies,
      query: { contactId: assignedStudentId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 for the assigned coach and their own student", async () => {
    const res = await call(conversationGET, {
      cookies: ownerCoachCookies,
      query: { contactId: assignedStudentId },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ conversationId: string }>();
    expect(body.conversationId).toBeTruthy();
  });
});

// ── GET /api/coach/conversation/message?conversationId= ──────────────────────

describe("GET /api/coach/conversation/message", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await call(conversationMsgGET, {
      cookies: ANON.cookies,
      query: { conversationId: ownConversationId },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular user accessing a coach conversation (AUDIT: currently returns 200 — no role check)", async () => {
    const res = await call(conversationMsgGET, {
      cookies: regularCookies,
      query: { conversationId: ownConversationId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when a coach reads messages from a conversation they don't own (AUDIT: currently 200)", async () => {
    // otherCoach should not be able to read ownerCoach's conversation
    const res = await call(conversationMsgGET, {
      cookies: otherCoachCookies,
      query: { conversationId: ownConversationId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 for the coach who owns the conversation", async () => {
    const res = await call(conversationMsgGET, {
      cookies: ownerCoachCookies,
      query: { conversationId: ownConversationId },
    });
    expect(res.status).toBe(200);
  });
});

// ── PATCH /api/coach/lesson-tasks ────────────────────────────────────────────
// This route uses FormData (multipart), not JSON.
// Auth tests only — ownership test requires a FormData helper (future work).

describe("PATCH /api/coach/lesson-tasks — auth only", () => {
  it.todo(
    "returns 403 for a regular user (ownership check needs FormData helper)",
  );
  it.todo(
    "returns 403 when a coach updates tasks for a student they don't own",
  );
});
