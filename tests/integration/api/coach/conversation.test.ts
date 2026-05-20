/**
 * Ownership tests for GET /api/coach/conversation.
 *
 * Role-gate assertions live in tests/integration/api/_auth-matrix.test.ts.
 *
 * Audit: route lets any coach initiate a conversation with any student.
 * Wrong-coach test is RED until the ownership helper lands.
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

import { GET as conversationGET } from "@/src/app/api/coach/conversation/route";

let ownerCoachCookies: string;
let otherCoachCookies: string;
let assignedStudentId: string;

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "bypass" });

  const { account: ownerAccount, coach: ownerCoach } = await createCoach();
  const familyAccount = await createAccount({ role: 1 });
  const assignedStudent = await createStudent(familyAccount);
  assignedStudentId = assignedStudent.id;
  await linkCoachToStudent(ownerCoach, assignedStudent);
  ownerCoachCookies = await signSessionFor(ownerAccount);

  const { account: otherAccount } = await createCoach();
  otherCoachCookies = await signSessionFor(otherAccount);
});

afterAll(() => server.close());

describe("GET /api/coach/conversation — ownership", () => {
  it("returns 403 when a coach tries to initiate a conversation with a student they don't own (AUDIT: currently 200)", async () => {
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
