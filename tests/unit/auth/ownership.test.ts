import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assertOwnsStudent,
  assertCoachAssignedToStudent,
  assertCoachOwnsConversation,
} from "@/src/lib/auth/server/ownership";
import type { AuthContext } from "@/src/lib/auth/server/requireRole";

const USER_ID = "00000000-0000-0000-0000-00000000aaaa";
const OTHER_USER_ID = "00000000-0000-0000-0000-00000000bbbb";
const STUDENT_ID = "11111111-1111-1111-1111-111111111111";
const COACH_ID = "22222222-2222-2222-2222-222222222222";
const CONVERSATION_ID = "33333333-3333-3333-3333-333333333333";

type TableResults = Record<string, { data: unknown }>;

/**
 * Builds a fake supabase client whose `.from(table)` chain ends in
 * `maybeSingle()` resolving to the per-table value in `results`. Any chain
 * method (select/eq) returns the same builder; only `maybeSingle` resolves.
 */
function fakeSupabase(results: TableResults) {
  return {
    from: vi.fn((table: string) => {
      const result = results[table] ?? { data: null };
      const builder: Record<string, unknown> = {};
      const passthrough = () => builder;
      builder.select = vi.fn(passthrough);
      builder.eq = vi.fn(passthrough);
      builder.maybeSingle = vi.fn().mockResolvedValue(result);
      builder.single = vi.fn().mockResolvedValue(result);
      return builder;
    }),
  };
}

function authCtx(supabase: ReturnType<typeof fakeSupabase>): AuthContext {
  return {
    user: { id: USER_ID } as never,
    account: { id: USER_ID, role: 1, email: "u@x.com" },
    supabase: supabase as never,
  };
}

beforeEach(() => {
  // no-op; per-test factories build fresh stubs
});

describe("assertOwnsStudent", () => {
  it("returns 404 'Student not found' when student does not exist", async () => {
    const ctx = authCtx(fakeSupabase({ students: { data: null } }));
    const res = await assertOwnsStudent(ctx, STUDENT_ID);
    expect(res).toBeInstanceOf(Response);
    const r = res as Response;
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: "Student not found" });
  });

  it("returns 403 'Forbidden' when student belongs to a different account", async () => {
    const ctx = authCtx(
      fakeSupabase({
        students: { data: { id: STUDENT_ID, account_id: OTHER_USER_ID } },
      }),
    );
    const res = await assertOwnsStudent(ctx, STUDENT_ID);
    expect(res).toBeInstanceOf(Response);
    const r = res as Response;
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "Forbidden" });
  });

  it("returns the student row when caller owns it", async () => {
    const ctx = authCtx(
      fakeSupabase({
        students: { data: { id: STUDENT_ID, account_id: USER_ID } },
      }),
    );
    const res = await assertOwnsStudent(ctx, STUDENT_ID);
    expect(res).not.toBeInstanceOf(Response);
    if (res instanceof Response) throw new Error("unreachable");
    expect(res).toEqual({
      student: { id: STUDENT_ID, account_id: USER_ID },
    });
  });
});

describe("assertCoachAssignedToStudent", () => {
  it("returns 500 'Coach record missing' and logs context when no coaches row exists", async () => {
    const ctx = authCtx(fakeSupabase({ coaches: { data: null } }));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await assertCoachAssignedToStudent(ctx, STUDENT_ID);
    expect(res).toBeInstanceOf(Response);
    const r = res as Response;
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "Coach record missing" });
    expect(errSpy).toHaveBeenCalledWith(
      "assertCoachAssignedToStudent: role=2 but no coaches row",
      { userId: USER_ID },
    );
  });

  it("returns 403 'Forbidden' when no coach_students row links coach to student", async () => {
    const ctx = authCtx(
      fakeSupabase({
        coaches: { data: { id: COACH_ID } },
        coach_students: { data: null },
      }),
    );
    const res = await assertCoachAssignedToStudent(ctx, STUDENT_ID);
    expect(res).toBeInstanceOf(Response);
    const r = res as Response;
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "Forbidden" });
  });

  it("returns { coachId, studentId } when assignment exists", async () => {
    const ctx = authCtx(
      fakeSupabase({
        coaches: { data: { id: COACH_ID } },
        coach_students: { data: { coach_id: COACH_ID } },
      }),
    );
    const res = await assertCoachAssignedToStudent(ctx, STUDENT_ID);
    expect(res).not.toBeInstanceOf(Response);
    if (res instanceof Response) throw new Error("unreachable");
    expect(res).toEqual({ coachId: COACH_ID, studentId: STUDENT_ID });
  });
});

describe("assertCoachOwnsConversation", () => {
  it("returns 500 'Coach record missing' and logs context when no coaches row exists", async () => {
    const ctx = authCtx(fakeSupabase({ coaches: { data: null } }));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await assertCoachOwnsConversation(ctx, CONVERSATION_ID);
    expect(res).toBeInstanceOf(Response);
    const r = res as Response;
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "Coach record missing" });
    expect(errSpy).toHaveBeenCalledWith(
      "assertCoachOwnsConversation: role=2 but no coaches row",
      { userId: USER_ID },
    );
  });

  it("returns 404 'Conversation not found' when conversation does not exist", async () => {
    const ctx = authCtx(
      fakeSupabase({
        coaches: { data: { id: COACH_ID } },
        conversations: { data: null },
      }),
    );
    const res = await assertCoachOwnsConversation(ctx, CONVERSATION_ID);
    expect(res).toBeInstanceOf(Response);
    const r = res as Response;
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: "Conversation not found" });
  });

  it("returns 403 'Forbidden' when conversation belongs to a different coach", async () => {
    const ctx = authCtx(
      fakeSupabase({
        coaches: { data: { id: COACH_ID } },
        conversations: {
          data: {
            id: CONVERSATION_ID,
            coach_id: "99999999-9999-9999-9999-999999999999",
            profile_id: "p",
            profile_type: "student",
          },
        },
      }),
    );
    const res = await assertCoachOwnsConversation(ctx, CONVERSATION_ID);
    expect(res).toBeInstanceOf(Response);
    const r = res as Response;
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "Forbidden" });
  });

  it("returns the conversation when caller owns it", async () => {
    const conversation = {
      id: CONVERSATION_ID,
      coach_id: COACH_ID,
      profile_id: "p1",
      profile_type: "student",
    };
    const ctx = authCtx(
      fakeSupabase({
        coaches: { data: { id: COACH_ID } },
        conversations: { data: conversation },
      }),
    );
    const res = await assertCoachOwnsConversation(ctx, CONVERSATION_ID);
    expect(res).not.toBeInstanceOf(Response);
    if (res instanceof Response) throw new Error("unreachable");
    expect(res).toEqual({ conversation });
  });
});
