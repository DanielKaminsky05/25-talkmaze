/**
 * Regression test for /api/parent/students/[studentId] — CRITICAL security hole.
 *
 * The route accepts a studentId from the URL and returns parent account info
 * with NO authentication check. Any request can enumerate student→parent mappings.
 *
 * EXPECTED STATE TODAY: auth tests are RED (route returns 200 to everyone).
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  createAccount,
  createParent,
  createStudent,
} from "@tests/helpers/factories";
import { signSessionFor, ANON } from "@tests/helpers/auth";
import { call } from "@tests/helpers/request";
import { GET } from "@/src/app/api/parent/students/[studentId]/route";

let ownerCookies: string;
let otherUserCookies: string;
let studentId: string;

beforeAll(async () => {
  // The student's owner
  const ownerAccount = await createAccount({ role: 1 });
  const parent = await createParent(ownerAccount);
  const student = await createStudent(ownerAccount);
  studentId = student.id;
  ownerCookies = await signSessionFor(ownerAccount);

  // An unrelated user
  const other = await createAccount({ role: 1 });
  otherUserCookies = await signSessionFor(other);
});

describe("GET /api/parent/students/[studentId]", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await call(GET, {
      cookies: ANON.cookies,
      params: { studentId },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller does not own the student (AUDIT: currently returns 200)", async () => {
    const res = await call(GET, {
      cookies: otherUserCookies,
      params: { studentId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 when the caller owns the student", async () => {
    const res = await call(GET, {
      cookies: ownerCookies,
      params: { studentId },
    });
    expect(res.status).toBe(200);
  });

  it("returns JSON with correct HTTP status on not-found (not 200 with status in body)", async () => {
    const res = await call(GET, {
      cookies: ownerCookies,
      params: { studentId: "00000000-0000-0000-0000-000000000000" },
    });
    // AUDIT: currently returns 200 with { status: 404 } in body — wrong.
    // Should return HTTP 404.
    expect(res.status).toBe(404);
  });
});
