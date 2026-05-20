/**
 * Ownership tests for GET /api/coach/lessons.
 *
 * Role-gate assertions live in tests/integration/api/_auth-matrix.test.ts.
 *
 * Audit: route accepts ?studentId= without checking the coach owns that
 * student. The wrong-coach test is RED until `assertCoachAssignedToStudent`
 * lands.
 *
 * The 200-for-assigned-coach happy path is blocked by a pre-existing PGRST201
 * bug — see the todos at the end of the file.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createAccount,
  createCoach,
  createStudent,
  linkCoachToStudent,
} from "@tests/helpers/factories";
import { signSessionFor } from "@tests/helpers/auth";
import { call } from "@tests/helpers/request";
import { server } from "@tests/helpers/msw";

import { GET as lessonsGET } from "@/src/app/api/coach/lessons/route";

let otherCoachCookies: string;
let assignedStudentId: string;

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "bypass" });

  const { coach: ownerCoach } = await createCoach();
  const familyAccount = await createAccount({ role: 1 });
  const assignedStudent = await createStudent(familyAccount);
  assignedStudentId = assignedStudent.id;
  await linkCoachToStudent(ownerCoach, assignedStudent);

  const { account: otherAccount } = await createCoach();
  otherCoachCookies = await signSessionFor(otherAccount);
});

afterAll(() => server.close());

describe("GET /api/coach/lessons — ownership", () => {
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

  it.todo("returns 200 with no studentId — same PGRST201 blocker as above");
});
