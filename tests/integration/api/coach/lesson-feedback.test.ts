/**
 * Ownership tests for PATCH /api/coach/lesson-feedback.
 *
 * Role-gate assertions (401 anon, 403 wrong role) live in
 * tests/integration/api/_auth-matrix.test.ts. This file covers the
 * second-line check: right role, wrong resource.
 *
 * Audit: the route currently accepts any authenticated user's body and trusts
 * whatever student_id it receives. The wrong-coach test is RED until
 * `assertCoachAssignedToStudent` lands.
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
import { createClient } from "@supabase/supabase-js";

import { PATCH as feedbackPATCH } from "@/src/app/api/coach/lesson-feedback/route";

let ownerCoachCookies: string;
let otherCoachCookies: string;
let assignedStudentId: string;
let lessonId: string;

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

  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: course } = await adminDb
    .from("courses")
    .insert({ title: "Test Course" })
    .select()
    .single();
  const { data: lesson } = await adminDb
    .from("lessons")
    .insert({ course_id: course!.id, title: "Lesson 1", slug: `lesson-${Date.now()}` })
    .select()
    .single();
  lessonId = lesson!.id;
});

afterAll(() => server.close());

describe("PATCH /api/coach/lesson-feedback — ownership", () => {
  const baseBody = {
    positive_feedback: "<p>Great work</p>",
    improvement_feedback: "<p>Keep going</p>",
  };

  it("returns 403 when a coach writes feedback for a student they don't own (AUDIT: currently 200)", async () => {
    const res = await call(feedbackPATCH, {
      method: "PATCH",
      cookies: otherCoachCookies,
      body: { ...baseBody, student_id: assignedStudentId, lesson_id: lessonId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 when the assigned coach writes feedback for their own student", async () => {
    const res = await call(feedbackPATCH, {
      method: "PATCH",
      cookies: ownerCoachCookies,
      body: { ...baseBody, student_id: assignedStudentId, lesson_id: lessonId },
    });
    expect(res.status).toBe(200);
  });
});
