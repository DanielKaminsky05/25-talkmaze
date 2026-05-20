/**
 * Regression test for /api/coach/lessonspace/[coachId]/[studentId] — CRITICAL.
 *
 * The route generates and persists a LessonSpace teacher join URL with NO auth
 * check. Any user can mint a teacher link for any coach/student pair.
 *
 * EXPECTED STATE TODAY:
 *   - Unauthenticated → currently returns 200 (should be 401)
 *   - Regular user    → currently returns 200 (should be 403)
 *   - Wrong coach     → currently returns 200 (should be 403)
 *   - Correct coach   → returns 200 ✓ (already works)
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
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
let studentId: string;
let coachCookies: string;
let otherCoachCookies: string;
let regularCookies: string;

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "bypass" });

  // Create the primary coach + a student with a lesson_space_id so the route
  // can resolve both and reach LessonSpace without crashing.
  const { account: coachAccount, coach } = await createCoach();
  coachAccountId = coachAccount.id;

  const familyAccount = await createAccount({ role: 1 });
  const student = await createStudent(familyAccount, {
    // lesson_space_id is a UUID column — must be a valid UUID
    lesson_space_id: "00000000-0000-0000-0000-000000000001",
  });
  studentId = student.id;

  await linkCoachToStudent(coach, student);
  coachCookies = await signSessionFor(coachAccount);

  // A second coach who is NOT linked to this student
  const { account: otherCoachAccount } = await createCoach();
  otherCoachCookies = await signSessionFor(otherCoachAccount);

  // A regular family user
  const regular = await createAccount({ role: 1 });
  regularCookies = await signSessionFor(regular);
});

afterAll(() => server.close());
afterEach(() => server.resetHandlers());

describe("GET /api/coach/lessonspace/[coachId]/[studentId]", () => {
  it("returns 401 when unauthenticated (AUDIT: currently returns 200)", async () => {
    const res = await call(GET, {
      cookies: ANON.cookies,
      params: { coachId: coachAccountId, studentId },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular user (AUDIT: currently returns 200)", async () => {
    const res = await call(GET, {
      cookies: regularCookies,
      params: { coachId: coachAccountId, studentId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when a different coach requests the link (AUDIT: currently returns 200)", async () => {
    const res = await call(GET, {
      cookies: otherCoachCookies,
      params: { coachId: coachAccountId, studentId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 and a URL for the coach who owns the relationship", async () => {
    const res = await call(GET, {
      cookies: coachCookies,
      params: { coachId: coachAccountId, studentId },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ client_url: string }>();
    expect(body.client_url).toBeTruthy();
  });
});
