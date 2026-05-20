/**
 * Behavioural tests for GET /api/coach/sessions.
 *
 * Role-gate assertions live in tests/integration/api/_auth-matrix.test.ts.
 *
 * The route is already coach-scoped (filters by coach_id), so the interesting
 * tests are about scoping correctness rather than ownership 403s.
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

import { GET as sessionsGET } from "@/src/app/api/coach/sessions/route";

let ownerCoachCookies: string;
let foreignStudentId: string;

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "bypass" });

  const { account: ownerAccount, coach: ownerCoach } = await createCoach();
  const familyAccount = await createAccount({ role: 1 });
  const assignedStudent = await createStudent(familyAccount);
  await linkCoachToStudent(ownerCoach, assignedStudent);
  ownerCoachCookies = await signSessionFor(ownerAccount);

  // A second coach with their own separate student, NOT linked to ownerCoach.
  const { coach: otherCoach } = await createCoach();
  const otherFamily = await createAccount({ role: 1 });
  const foreignStudent = await createStudent(otherFamily);
  foreignStudentId = foreignStudent.id;
  await linkCoachToStudent(otherCoach, foreignStudent);
});

afterAll(() => server.close());

describe("GET /api/coach/sessions", () => {
  it("returns 200 for a coach (filtered to their own sessions)", async () => {
    const res = await call(sessionsGET, { cookies: ownerCoachCookies });
    expect(res.status).toBe(200);
  });

  it("does not leak the other coach's sessions when student_id filter is applied", async () => {
    // foreignStudentId belongs to otherCoach, not ownerCoach. The route scopes
    // by coach_id so ownerCoach should get an empty list, not 403.
    const res = await call(sessionsGET, {
      cookies: ownerCoachCookies,
      query: { student_id: foreignStudentId },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ sessions: unknown[] }>();
    expect(body.sessions).toHaveLength(0); // no cross-coach leakage
  });
});
