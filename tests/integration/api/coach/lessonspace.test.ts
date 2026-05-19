/**
 * Regression test for /api/coach/lessonspace/[coachId]/[studentId] — CRITICAL.
 *
 * The route generates and persists a LessonSpace teacher join URL with NO auth
 * check. Any user can mint a teacher link for any coach/student pair.
 *
 * EXPECTED STATE TODAY: auth tests are RED (route returns 200 to everyone).
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import {
  createAccount,
  createCoach,
  createStudent,
  linkCoachToStudent,
} from "@tests/helpers/factories";
import { signSessionFor, ANON } from "@tests/helpers/auth";
import { call } from "@tests/helpers/request";
import { server } from "@tests/helpers/msw";
import { GET } from "@/src/app/api/coach/lessonspace/[coachId]/[studentId]/route";

let coachAccountId: string;
let coachId: string;
let studentId: string;
let coachCookies: string;
let otherCoachCookies: string;
let regularCookies: string;

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "bypass" });

  const { account: coachAccount, coach } = await createCoach();
  coachAccountId = coachAccount.id;
  coachId = coach.id;

  const familyAccount = await createAccount({ role: 1 });
  const student = await createStudent(familyAccount);
  studentId = student.id;

  await linkCoachToStudent(coach, student);

  coachCookies = await signSessionFor(coachAccount);

  const { account: otherCoach } = await createCoach();
  otherCoachCookies = await signSessionFor(otherCoach);

  const regular = await createAccount({ role: 1 });
  regularCookies = await signSessionFor(regular);
});

afterEach(() => server.resetHandlers());

describe("GET /api/coach/lessonspace/[coachId]/[studentId]", () => {
  it("returns 401 when unauthenticated (AUDIT: currently returns 200)", async () => {
    const res = await call(GET, {
      cookies: ANON.cookies,
      params: { coachId: coachAccountId, studentId },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular user", async () => {
    const res = await call(GET, {
      cookies: regularCookies,
      params: { coachId: coachAccountId, studentId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when a different coach requests the link (AUDIT: currently returns 200)", async () => {
    // A coach can only generate links for their own students.
    const res = await call(GET, {
      cookies: otherCoachCookies,
      params: { coachId: coachAccountId, studentId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 for the coach who owns the relationship", async () => {
    const res = await call(GET, {
      cookies: coachCookies,
      params: { coachId: coachAccountId, studentId },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ url: string }>();
    expect(body.url).toBeTruthy();
  });
});
