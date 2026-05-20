/**
 * Contract tests for GET /api/coach/lessonspace/[coachId]/[studentId].
 *
 * Mints a LessonSpace teacher launch URL for a coach/student pair AND
 * persists it on `students.lesson_space_teacher_link`.
 *
 * Five questions (per docs/api-contract.md + test-rewrite-runbook):
 *   Q1 WHO CAN CALL IT?       — ownership + the URL-identity check
 *                                (params.coachId === auth.user.id per
 *                                 api-ownership.md:289)
 *   Q2 WHAT INPUTS?           — UUID validation on both path params
 *   Q3 WHAT DOES IT RETURN?   — LessonSpaceLaunchResult (client_url + room_id)
 *   Q4 WHAT DOES IT PERSIST?  — students.lesson_space_teacher_link
 *   Q5 WHAT EXTERNAL CALLS?   — POST to LessonSpace launch endpoint
 *
 * Role-gate cases (anon 401, role-1/3 403) live in _auth-matrix.test.ts.
 *
 * AUDIT REMINDER: today the route has NO auth and trusts coachId from the URL.
 * Any caller can mint a teacher link for any pair. This file's failing tests
 * are exactly that bug, asserted as the future-correct state.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { http, HttpResponse } from "msw";
import {
  createAccount,
  createCoach,
  createStudent,
  linkCoachToStudent,
} from "@tests/helpers/factories";
import { signSessionFor } from "@tests/helpers/auth";
import { resetAll } from "@tests/helpers/db";
import { call } from "@tests/helpers/request";
import { server } from "@tests/helpers/msw";
import { expectRowExists, getRow } from "@tests/helpers/sideEffects";

import { GET } from "@/src/app/api/coach/lessonspace/[coachId]/[studentId]/route";

const FAKE_ROOM_ID = "00000000-0000-0000-0000-000000000001";

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());
beforeEach(resetAll);
afterEach(() => server.resetHandlers());

/**
 * Seed a coach linked to a student that has a lesson_space_id. Returns the
 * coach's account id (URL coachId), the student id, and the coach's cookies.
 */
async function seedCoachStudentPair() {
  const { account: coachAccount, coach } = await createCoach();
  const familyAccount = await createAccount({ role: 1 });
  const student = await createStudent(familyAccount, {
    lesson_space_id: FAKE_ROOM_ID,
  });
  await linkCoachToStudent(coach, student);
  const cookies = await signSessionFor(coachAccount);
  return { coachAccount, coach, student, cookies };
}

// ═════════════════════════════════════════════════════════════════════════════
// Q1: WHO CAN CALL IT?
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/coach/lessonspace/[coachId]/[studentId] — ownership", () => {
  it("returns 403 when authenticated coach is not assigned to this student", async () => {
    const { coachAccount, student } = await seedCoachStudentPair();

    // A second coach who is NOT linked to this student.
    const { account: otherCoachAccount } = await createCoach();
    const otherCookies = await signSessionFor(otherCoachAccount);

    const res = await call(GET, {
      cookies: otherCookies,
      params: { coachId: coachAccount.id, studentId: student.id },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when params.coachId does not match the calling user (URL identity spoof)", async () => {
    const { student, cookies } = await seedCoachStudentPair();

    // Caller is the real coach (cookies above), but uses someone else's coachId in the URL.
    const { account: foreignCoachAccount } = await createCoach();

    const res = await call(GET, {
      cookies, // real coach
      params: { coachId: foreignCoachAccount.id, studentId: student.id },
    });
    expect(res.status).toBe(403);
  });

  it("does NOT call LessonSpace when ownership check fails", async () => {
    const { coachAccount, student } = await seedCoachStudentPair();
    const { account: otherCoachAccount } = await createCoach();
    const otherCookies = await signSessionFor(otherCoachAccount);

    let lessonSpaceHit = false;
    server.use(
      http.post("https://api.thelessonspace.com/v2/spaces/launch/", () => {
        lessonSpaceHit = true;
        return HttpResponse.json({ client_url: "x", room_id: FAKE_ROOM_ID });
      }),
    );

    await call(GET, {
      cookies: otherCookies,
      params: { coachId: coachAccount.id, studentId: student.id },
    });

    expect(lessonSpaceHit).toBe(false);
  });

  it("does NOT persist lesson_space_teacher_link when ownership check fails", async () => {
    const { coachAccount, student } = await seedCoachStudentPair();
    const { account: otherCoachAccount } = await createCoach();
    const otherCookies = await signSessionFor(otherCoachAccount);

    await call(GET, {
      cookies: otherCookies,
      params: { coachId: coachAccount.id, studentId: student.id },
    });

    const row = await getRow("students", { id: student.id });
    expect(row?.lesson_space_teacher_link).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Q2: WHAT INPUTS DOES IT ACCEPT?
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/coach/lessonspace/[coachId]/[studentId] — input validation", () => {
  it("returns 400 when coachId is not a UUID", async () => {
    const { student, cookies } = await seedCoachStudentPair();

    const res = await call(GET, {
      cookies,
      params: { coachId: "not-a-uuid", studentId: student.id },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when studentId is not a UUID", async () => {
    const { coachAccount, cookies } = await seedCoachStudentPair();

    const res = await call(GET, {
      cookies,
      params: { coachId: coachAccount.id, studentId: "not-a-uuid" },
    });
    expect(res.status).toBe(400);
  });

  it("error responses use the { error: string } shape", async () => {
    const { student, cookies } = await seedCoachStudentPair();

    const res = await call(GET, {
      cookies,
      params: { coachId: "not-a-uuid", studentId: student.id },
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

describe("GET /api/coach/lessonspace/[coachId]/[studentId] — response shape", () => {
  it("returns client_url and room_id on success", async () => {
    const { coachAccount, student, cookies } = await seedCoachStudentPair();

    const res = await call(GET, {
      cookies,
      params: { coachId: coachAccount.id, studentId: student.id },
    });
    expect(res.status).toBe(200);

    const body = await res.json<{ client_url: string; room_id: string }>();
    expect(typeof body.client_url).toBe("string");
    expect(body.client_url.length).toBeGreaterThan(0);
    expect(typeof body.room_id).toBe("string");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Q4: WHAT DOES IT PERSIST?
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/coach/lessonspace/[coachId]/[studentId] — side effects", () => {
  it("persists students.lesson_space_teacher_link on success", async () => {
    const { coachAccount, student, cookies } = await seedCoachStudentPair();

    await call(GET, {
      cookies,
      params: { coachId: coachAccount.id, studentId: student.id },
    });

    const row = await expectRowExists("students", { id: student.id });
    expect(row.lesson_space_teacher_link).toBeTruthy();
    expect(typeof row.lesson_space_teacher_link).toBe("string");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Q5: WHAT EXTERNAL CALLS DID IT MAKE?
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/coach/lessonspace/[coachId]/[studentId] — external calls", () => {
  it("calls LessonSpace launch with the student's lesson_space_id as the room id", async () => {
    const { coachAccount, student, cookies } = await seedCoachStudentPair();

    let capturedBody: Record<string, unknown> | null = null;
    server.use(
      http.post(
        "https://api.thelessonspace.com/v2/spaces/launch/",
        async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            client_url: "https://app.thelessonspace.com/room/test-room",
            room_id: FAKE_ROOM_ID,
          });
        },
      ),
    );

    await call(GET, {
      cookies,
      params: { coachId: coachAccount.id, studentId: student.id },
    });

    expect(capturedBody).not.toBeNull();
    expect(capturedBody).toMatchObject({ id: FAKE_ROOM_ID });
  });

  it("does NOT call LessonSpace when the student has no lesson_space_id", async () => {
    const { account: coachAccount, coach } = await createCoach();
    const familyAccount = await createAccount({ role: 1 });
    // Student WITHOUT a lesson_space_id
    const student = await createStudent(familyAccount, { lesson_space_id: null });
    await linkCoachToStudent(coach, student);
    const cookies = await signSessionFor(coachAccount);

    let lessonSpaceHit = false;
    server.use(
      http.post("https://api.thelessonspace.com/v2/spaces/launch/", () => {
        lessonSpaceHit = true;
        return HttpResponse.json({ client_url: "x", room_id: FAKE_ROOM_ID });
      }),
    );

    const res = await call(GET, {
      cookies,
      params: { coachId: coachAccount.id, studentId: student.id },
    });

    // Either 404 (no room provisioned yet) or 422 (cannot complete) is
    // contract-acceptable; the key thing is we don't hit LessonSpace.
    expect([404, 422]).toContain(res.status);
    expect(lessonSpaceHit).toBe(false);
  });
});
