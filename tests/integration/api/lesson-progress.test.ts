/**
 * Contract tests for GET /api/lesson-progress.
 *
 * Returns completed/total lesson counts for the calling user's student.
 * Family-only in practice (looks up student by account_id).
 *
 * Five questions:
 *   Q1 ownership — implicit (caller's own student)
 *   Q2 validation — no body; no query (operates on calling user)
 *   Q3 response — { completed, total, studentId } OR { error } for 404 — never mixed
 *   Q4 side effects — none
 *   Q5 external calls — none
 *
 * The current route returns 200 with `{ completed: 0, total: 0, error: "..." }`
 * when there's no student profile — that's a contract violation (mixed error+success).
 * The new contract: 404 with `{ error: "..." }` only.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { createAccount, createStudent } from "@tests/helpers/factories";
import { signSessionFor } from "@tests/helpers/auth";
import { resetAll } from "@tests/helpers/db";
import { call } from "@tests/helpers/request";
import { server } from "@tests/helpers/msw";

import { GET } from "@/src/app/api/lesson-progress/route";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());
beforeEach(resetAll);

describe("GET /api/lesson-progress — response shape", () => {
  it("returns { completed, total, studentId } when calling user has a student", async () => {
    const owner = await createAccount({ role: 1 });
    const student = await createStudent(owner);
    const cookies = await signSessionFor(owner);

    const res = await call(GET, { cookies });
    expect(res.status).toBe(200);
    const body = await res.json<{
      completed: number;
      total: number;
      studentId: string;
    }>();
    expect(typeof body.completed).toBe("number");
    expect(typeof body.total).toBe("number");
    expect(body.studentId).toBe(student.id);
    // Confirm error key is NOT mixed into the success body.
    expect((body as { error?: unknown }).error).toBeUndefined();
  });

  it("returns 404 { error: string } when caller has no student profile (no mixed body)", async () => {
    const owner = await createAccount({ role: 1 });
    const cookies = await signSessionFor(owner);

    const res = await call(GET, { cookies });
    expect(res.status).toBe(404);
    const body = await res.json<{
      error?: string;
      completed?: number;
      total?: number;
    }>();
    expect(typeof body.error).toBe("string");
    // Success keys MUST NOT appear in the error body.
    expect(body.completed).toBeUndefined();
    expect(body.total).toBeUndefined();
  });
});
