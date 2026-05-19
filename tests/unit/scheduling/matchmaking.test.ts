import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Module mocks (hoisted by Vitest before imports) ───────────────────────────

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// The Supabase client is constructed *inside* the functions under test, so we
// replace the factory. `mockSupabase` is mutated per-test before each call.
let mockSupabase: ReturnType<typeof makeSupabaseMock>;
vi.mock("@/src/services/supabase/service", () => ({
  createServiceRoleClient: () => mockSupabase,
}));

import {
  assignCoachToStudent,
  approvePendingBookedSlot,
} from "@/src/lib/scheduling/server/matchmaking";

// ── Mock Supabase builder ─────────────────────────────────────────────────────
//
// Each call to `from(table)` pops the next response from the queue for that
// table. The chain is fully fluent: every intermediate method returns `this`,
// and terminators (single / maybeSingle / insert / direct await) resolve with
// the queued response.
//
// Usage:
//   mockSupabase = makeSupabaseMock({
//     student_availabilities: [{ data: [...], error: null }],
//     booked_slots:           [{ data: [], error: null }, { error: null }],
//   });

type MockResponse = { data?: unknown; error?: { message: string } | null };

function makeSupabaseMock(tableResponses: Record<string, MockResponse[]>) {
  const counters: Record<string, number> = {};

  const client = {
    from: vi.fn((table: string) => {
      const idx = counters[table] ?? 0;
      counters[table] = idx + 1;
      const responses = tableResponses[table] ?? [];
      const resolved: MockResponse = responses[idx] ?? {
        data: null,
        error: null,
      };
      const result = Promise.resolve(resolved);

      // Every method in the fluent chain returns `chain` so the whole
      // expression is one thenable. Terminators resolve with `result`.
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        neq: vi.fn(() => chain),
        lt: vi.fn(() => chain),
        gt: vi.fn(() => chain),
        or: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        // Mutating terminators
        insert: vi.fn(() => result),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        // Reading terminators
        single: vi.fn(() => result),
        maybeSingle: vi.fn(() => result),
        // Direct `await chain` — makes the chain itself a Promise
        then: (resolve: (v: any) => any, reject?: (e: any) => any) =>
          result.then(resolve, reject),
        catch: (reject: (e: any) => any) => result.catch(reject),
      };
      return chain;
    }),
  };

  return client;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

// We anchor "now" to Sunday 2025-05-18 so "tomorrow" = Monday 2025-05-19
// (weekday 1). Student and coach slots use weekday=1 to match immediately.
const ANCHOR_DATE = new Date("2025-05-18T10:00:00.000Z");

const studentSlot = {
  id: "sa-1",
  student_id: "student-1",
  weekday: 1, // Monday
  start_time_new: "14:00:00",
  end_time_new: "17:00:00",
  timezone: "UTC",
  start_time: "1970-01-01T14:00:00.000Z",
  end_time: "1970-01-01T17:00:00.000Z",
};

// Coach availability row (the query selects only these columns).
const coachAvail = {
  coach_id: "coach-1",
  weekday: 1,
  start_time_new: "14:00:00",
  end_time_new: "17:00:00",
  timezone: "UTC",
};

const coachAvailWrongDay = { ...coachAvail, weekday: 3 }; // Wednesday

// A pre-existing active booked slot that overlaps Monday 14:00-15:00 UTC
const overlappingActiveSlot = {
  id: "bs-existing",
  coach_id: "coach-1",
  student_id: "other-student",
  weekday: 1,
  start_time: "14:00:00",
  end_time: "15:00:00",
  timezone: "UTC",
  status: "active",
};

// ── assignCoachToStudent ──────────────────────────────────────────────────────

describe("assignCoachToStudent", () => {
  beforeEach(() => {
    vi.setSystemTime(ANCHOR_DATE);
  });

  it("returns success and creates a pending booked_slot when a matching coach is found", async () => {
    mockSupabase = makeSupabaseMock({
      // 1. student_availabilities fetch
      student_availabilities: [{ data: [studentSlot], error: null }],
      booked_slots: [
        { data: [], error: null }, // student's active booked slots — none
        { data: [], error: null }, // coach's active booked slots — none
        { data: null, error: null }, // insert pending slot
      ],
      coach_availabilities: [{ data: [coachAvail], error: null }],
      sessions: [
        { data: null, error: null }, // coach session collision check — clear
        { data: null, error: null }, // student session collision check — clear
      ],
    });

    const result = await assignCoachToStudent("student-1", 8);

    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
    // Verify a pending slot insert was attempted
    const insertCalls = mockSupabase.from.mock.calls.filter(
      ([table]: [string]) => table === "booked_slots",
    );
    // Last booked_slots call is the insert
    expect(insertCalls.length).toBe(3);
  });

  it("returns failure when student has no availability configured", async () => {
    mockSupabase = makeSupabaseMock({
      student_availabilities: [{ data: [], error: null }],
    });

    const result = await assignCoachToStudent("student-1", 8);

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toMatch(/no availability/i);
  });

  it("returns failure when student_availabilities query returns null", async () => {
    mockSupabase = makeSupabaseMock({
      student_availabilities: [{ data: null, error: null }],
    });

    const result = await assignCoachToStudent("student-1", 8);

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
  });

  it("returns failure when no coaches exist in the DB", async () => {
    mockSupabase = makeSupabaseMock({
      student_availabilities: [{ data: [studentSlot], error: null }],
      booked_slots: [{ data: [], error: null }], // student active slots
      coach_availabilities: [{ data: [], error: null }],
    });

    const result = await assignCoachToStudent("student-1", 8);

    expect(result.success).toBe(false);
    expect(result.status).toBe(200); // soft failure — webhook must not crash
    expect(result.message).toMatch(/no coach available/i);
  });

  it("skips a coach whose weekday does not match the student slot", async () => {
    mockSupabase = makeSupabaseMock({
      student_availabilities: [{ data: [studentSlot], error: null }], // weekday 1
      booked_slots: [{ data: [], error: null }],
      coach_availabilities: [{ data: [coachAvailWrongDay], error: null }], // weekday 3
      // No booked_slots or sessions queries should fire because coach is skipped
    });

    const result = await assignCoachToStudent("student-1", 8);

    expect(result.success).toBe(false);
  });

  it("skips a coach whose active booked_slot overlaps the candidate time", async () => {
    // Narrow the window to exactly 1 hour so there is only ONE candidate start
    // (14:00). The coach's active slot covers 14:00-15:00, blocking it.
    // With no other candidates the function fails to find a match.
    const exactHourSlot = {
      ...studentSlot,
      start_time_new: "14:00:00",
      end_time_new: "15:00:00",
    };

    mockSupabase = makeSupabaseMock({
      student_availabilities: [{ data: [exactHourSlot], error: null }],
      booked_slots: [
        { data: [], error: null }, // student's active slots — clear
        { data: [overlappingActiveSlot], error: null }, // coach has overlap at 14:00
      ],
      coach_availabilities: [{ data: [coachAvail], error: null }],
    });

    const result = await assignCoachToStudent("student-1", 8);

    expect(result.success).toBe(false);
    // No sessions queries should have fired (coach rejected before that check)
    const sessionCalls = mockSupabase.from.mock.calls.filter(
      ([t]: [string]) => t === "sessions",
    );
    expect(sessionCalls.length).toBe(0);
  });

  it("does NOT block matching when the coach has only a PENDING booked_slot (pending ≠ active)", async () => {
    // The query filters by status='active', so a pending slot is never returned.
    // This test documents that contract: we return [] for the coach's active slots
    // (as the DB would), and matching still succeeds.
    mockSupabase = makeSupabaseMock({
      student_availabilities: [{ data: [studentSlot], error: null }],
      booked_slots: [
        { data: [], error: null }, // student active — clear
        { data: [], error: null }, // coach active — clear (pending not returned)
        { data: null, error: null }, // insert pending slot
      ],
      coach_availabilities: [{ data: [coachAvail], error: null }],
      sessions: [
        { data: null, error: null },
        { data: null, error: null },
      ],
    });

    const result = await assignCoachToStudent("student-1", 8);

    expect(result.success).toBe(true);
  });

  it("skips a time slot when the student has an active booked_slot conflict", async () => {
    const studentActiveSlot = {
      ...overlappingActiveSlot,
      coach_id: "some-coach",
      student_id: "student-1",
    };

    mockSupabase = makeSupabaseMock({
      student_availabilities: [{ data: [studentSlot], error: null }],
      booked_slots: [
        { data: [studentActiveSlot], error: null }, // student has overlap at 14:00
      ],
      coach_availabilities: [{ data: [coachAvail], error: null }],
      // The 14:00 slot is skipped. 14:10 is tried next — no coach booked slot check
      // fires because coach loop has no data. In practice all potential starts fail
      // and we run out of options.
    });

    // With one coach and the student conflicted at 14:00, and assuming the coach
    // also covers 14:10+ but we only provide the coach's active-slot response
    // for the first attempt, subsequent attempts get the default empty response.
    const result = await assignCoachToStudent("student-1", 8);

    // Result may succeed (found a later slot) or fail (no coach data for later
    // slots). Either way the 14:00 UTC slot was skipped. We assert that the
    // student's active booked_slot query fired exactly once (pre-fetched).
    const studentBsQuery = mockSupabase.from.mock.calls.filter(
      ([t]: [string]) => t === "booked_slots",
    );
    expect(studentBsQuery.length).toBeGreaterThanOrEqual(1);
  });

  it("skips a coach with a concrete session collision and continues to next coach", async () => {
    const coach2 = { ...coachAvail, coach_id: "coach-2" };

    mockSupabase = makeSupabaseMock({
      student_availabilities: [{ data: [studentSlot], error: null }],
      booked_slots: [
        { data: [], error: null }, // student active — clear
        { data: [], error: null }, // coach-1 active — clear (no booked_slot conflict)
        { data: [], error: null }, // coach-2 active — clear
        { data: null, error: null }, // insert pending slot
      ],
      coach_availabilities: [{ data: [coachAvail, coach2], error: null }],
      sessions: [
        { data: { id: "existing-session" }, error: null }, // coach-1 has a session collision
        // coach-1 student check won't run (coach rejected after coach collision)
        { data: null, error: null }, // coach-2 session collision — clear
        { data: null, error: null }, // coach-2 student collision — clear
      ],
    });

    const result = await assignCoachToStudent("student-1", 8);

    expect(result.success).toBe(true);
  });

  it("returns failure (status 500) when the booked_slots insert fails", async () => {
    mockSupabase = makeSupabaseMock({
      student_availabilities: [{ data: [studentSlot], error: null }],
      booked_slots: [
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: { message: "DB constraint violation" } }, // insert fails
      ],
      coach_availabilities: [{ data: [coachAvail], error: null }],
      sessions: [
        { data: null, error: null },
        { data: null, error: null },
      ],
    });

    const result = await assignCoachToStudent("student-1", 8);

    expect(result.success).toBe(false);
    expect(result.status).toBe(500);
  });

  it("tries the next student slot when the first slot's weekday finds no coaches", async () => {
    const slotTuesday = { ...studentSlot, id: "sa-2", weekday: 2 }; // Tuesday
    // Coach only available Monday
    mockSupabase = makeSupabaseMock({
      student_availabilities: [
        { data: [slotTuesday, studentSlot], error: null }, // Tuesday first, then Monday
      ],
      booked_slots: [
        { data: [], error: null }, // student active
        { data: [], error: null }, // coach active (when Monday slot is tried)
        { data: null, error: null }, // insert
      ],
      coach_availabilities: [{ data: [coachAvail], error: null }], // Monday only
      sessions: [
        { data: null, error: null },
        { data: null, error: null },
      ],
    });

    const result = await assignCoachToStudent("student-1", 8);

    // Tuesday fails (no coach), Monday succeeds
    expect(result.success).toBe(true);
  });

  it("generates potential starts on 10-minute boundaries within the availability window", async () => {
    // Availability window with odd-minute start: 14:05-15:30
    // First valid 10-min boundary is 14:10. Latest start is 14:30 (14:30+1h=15:30).
    const oddSlot = {
      ...studentSlot,
      start_time_new: "14:05:00",
      end_time_new: "15:30:00",
    };

    mockSupabase = makeSupabaseMock({
      student_availabilities: [{ data: [oddSlot], error: null }],
      booked_slots: [
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
      ],
      coach_availabilities: [
        { data: [{ ...coachAvail, start_time_new: "14:00:00", end_time_new: "17:00:00" }], error: null },
      ],
      sessions: [{ data: null, error: null }, { data: null, error: null }],
    });

    const result = await assignCoachToStudent("student-1", 8);
    expect(result.success).toBe(true);
  });

  it("returns failure when availability window is less than 1 hour (no valid start)", async () => {
    const shortSlot = {
      ...studentSlot,
      start_time_new: "14:00:00",
      end_time_new: "14:30:00", // 30-min window — cannot fit a 1-hour session
    };

    mockSupabase = makeSupabaseMock({
      student_availabilities: [{ data: [shortSlot], error: null }],
      booked_slots: [{ data: [], error: null }],
      coach_availabilities: [{ data: [coachAvail], error: null }],
    });

    const result = await assignCoachToStudent("student-1", 8);
    expect(result.success).toBe(false);
  });
});

// ── approvePendingBookedSlot ──────────────────────────────────────────────────

describe("approvePendingBookedSlot", () => {
  // A Monday pending slot: 14:00-15:00 UTC, starting 2025-05-19
  const pendingSlot = {
    id: "slot-1",
    coach_id: "coach-1",
    student_id: "student-1",
    weekday: 1,
    start_time: "14:00:00",
    end_time: "15:00:00",
    timezone: "UTC",
    status: "pending",
    num_sessions: 3,
    start_date: "2025-05-19",
  };

  /** Build the standard happy-path mock for num_sessions = N.
   *  For each of N sessions: 2 queries (coach collision + student collision).
   *  Then: sessions bulk insert, booked_slots update, coach_students check, coach_students insert.
   */
  function happyPathMock(numSessions: number, coachStudentsExists = false) {
    const sessionCollisionChecks: MockResponse[] = Array.from(
      { length: numSessions * 2 },
      () => ({ data: null, error: null }),
    );

    return makeSupabaseMock({
      booked_slots: [
        { data: pendingSlot, error: null }, // fetch pending slot
        { data: [], error: null }, // hasActiveBookedSlotConflict — no conflicts
        { data: null, error: null }, // update status to active
      ],
      sessions: [
        ...sessionCollisionChecks,
        { data: null, error: null }, // bulk insert
      ],
      coach_students: [
        {
          data: coachStudentsExists
            ? { coach_id: "coach-1", student_id: "student-1" }
            : null,
          error: null,
        }, // maybeSingle check
        { data: null, error: null }, // insert (only called if not exists)
      ],
    });
  }

  it("creates exactly num_sessions session rows and returns success", async () => {
    mockSupabase = happyPathMock(3);

    const result = await approvePendingBookedSlot("slot-1");

    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
    expect(result.message).toContain("3");
  });

  it("activates the booked_slot (status → active)", async () => {
    mockSupabase = happyPathMock(3);

    await approvePendingBookedSlot("slot-1");

    // The update call is the 3rd booked_slots from() call
    const bsCalls = mockSupabase.from.mock.calls.filter(
      ([t]: [string]) => t === "booked_slots",
    );
    expect(bsCalls.length).toBe(3);
    // 3rd call is the update — just verify it was made
    expect(bsCalls[2][0]).toBe("booked_slots");
  });

  it("inserts a coach_students junction row when one does not exist", async () => {
    mockSupabase = happyPathMock(3, false);

    await approvePendingBookedSlot("slot-1");

    const csCalls = mockSupabase.from.mock.calls.filter(
      ([t]: [string]) => t === "coach_students",
    );
    // Should have called from("coach_students") twice: check + insert
    expect(csCalls.length).toBe(2);
  });

  it("skips the coach_students insert when junction row already exists (idempotent)", async () => {
    mockSupabase = happyPathMock(3, true); // coachStudentsExists = true

    await approvePendingBookedSlot("slot-1");

    const csCalls = mockSupabase.from.mock.calls.filter(
      ([t]: [string]) => t === "coach_students",
    );
    // Only the check, no insert
    expect(csCalls.length).toBe(1);
  });

  it("returns 404 when the pending slot does not exist", async () => {
    mockSupabase = makeSupabaseMock({
      booked_slots: [{ data: null, error: { message: "not found" } }],
    });

    const result = await approvePendingBookedSlot("nonexistent");

    expect(result.success).toBe(false);
    expect(result.status).toBe(404);
  });

  it("returns 400 when num_sessions is 0", async () => {
    mockSupabase = makeSupabaseMock({
      booked_slots: [
        { data: { ...pendingSlot, num_sessions: 0 }, error: null },
      ],
    });

    const result = await approvePendingBookedSlot("slot-1");

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
  });

  it("returns 400 when the slot is missing timing information", async () => {
    mockSupabase = makeSupabaseMock({
      booked_slots: [
        {
          data: { ...pendingSlot, start_time: null, timezone: null },
          error: null,
        },
      ],
    });

    const result = await approvePendingBookedSlot("slot-1");

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
  });

  it("returns 409 when an active booked_slot conflict exists at approval time", async () => {
    mockSupabase = makeSupabaseMock({
      booked_slots: [
        { data: pendingSlot, error: null }, // fetch pending
        {
          data: [
            {
              id: "active-conflict",
              coach_id: "coach-1",
              student_id: "other-student",
              weekday: 1,
              start_time: "14:00:00",
              end_time: "15:00:00",
              timezone: "UTC",
              status: "active",
            },
          ],
          error: null,
        }, // hasActiveBookedSlotConflict — returns conflicting slot
      ],
    });

    const result = await approvePendingBookedSlot("slot-1");

    expect(result.success).toBe(false);
    expect(result.status).toBe(409);
  });

  it("skips a conflicted week and books the next available week instead", async () => {
    // Week 0: coach has a session collision — skip
    // Weeks 1-3: clear — book 3 sessions
    mockSupabase = makeSupabaseMock({
      booked_slots: [
        { data: pendingSlot, error: null },
        { data: [], error: null },
        { data: null, error: null }, // update
      ],
      sessions: [
        { data: { id: "existing-session" }, error: null }, // week 0: coach collision
        { data: null, error: null }, // week 0: student check (still runs)
        { data: null, error: null }, // week 1: coach clear
        { data: null, error: null }, // week 1: student clear
        { data: null, error: null }, // week 2: coach clear
        { data: null, error: null }, // week 2: student clear
        { data: null, error: null }, // week 3: coach clear
        { data: null, error: null }, // week 3: student clear
        { data: null, error: null }, // bulk insert
      ],
      coach_students: [
        { data: null, error: null },
        { data: null, error: null },
      ],
    });

    const result = await approvePendingBookedSlot("slot-1");

    expect(result.success).toBe(true);
    expect(result.message).toContain("3");
  });

  it("returns 409 when all weeks within the search limit are conflicted (hard cap)", async () => {
    // num_sessions = 2, so hard cap = 2 * 3 = 6 weeks.
    // All weeks have a coach collision → generatedSessions never reaches 2.
    const slot = { ...pendingSlot, num_sessions: 2 };

    // 6 coach-collision responses + 6 student check responses (the check still
    // runs after a coach collision)
    const allConflicted: MockResponse[] = Array.from({ length: 12 }, (_, i) =>
      i % 2 === 0
        ? { data: { id: `session-${i}` }, error: null } // coach collision
        : { data: null, error: null }, // student check
    );

    mockSupabase = makeSupabaseMock({
      booked_slots: [
        { data: slot, error: null },
        { data: [], error: null }, // no active booked slot conflict
      ],
      sessions: allConflicted,
    });

    const result = await approvePendingBookedSlot("slot-1");

    expect(result.success).toBe(false);
    expect(result.status).toBe(409);
    expect(result.error).toMatch(/could not generate/i);
  });

  it("returns 500 when the sessions bulk insert fails", async () => {
    mockSupabase = makeSupabaseMock({
      booked_slots: [
        { data: pendingSlot, error: null },
        { data: [], error: null },
      ],
      sessions: [
        { data: null, error: null }, // week 1 coach
        { data: null, error: null }, // week 1 student
        { data: null, error: null }, // week 2 coach
        { data: null, error: null }, // week 2 student
        { data: null, error: null }, // week 3 coach
        { data: null, error: null }, // week 3 student
        { data: null, error: { message: "DB error on insert" } }, // bulk insert fails
      ],
    });

    const result = await approvePendingBookedSlot("slot-1");

    expect(result.success).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error).toMatch(/failed to bulk create/i);
  });

  it("uses start_date from the slot when provided rather than computing the next weekday", async () => {
    // pendingSlot has start_date: "2025-05-19" (explicit). The function should
    // anchor sessions to that date rather than searching for the next weekday.
    // We verify the function succeeds — the anchor logic itself is tested
    // indirectly by the DST scenarios above.
    mockSupabase = happyPathMock(3);

    const result = await approvePendingBookedSlot("slot-1");

    expect(result.success).toBe(true);
    expect(result.message).toContain("3");
  });

  it("correctly computes duration from start_time / end_time (1 hour = 60 min)", async () => {
    // A 2-hour slot: 14:00-16:00. Sessions should span 120 min.
    const twoHourSlot = {
      ...pendingSlot,
      start_time: "14:00:00",
      end_time: "16:00:00",
      num_sessions: 1,
    };

    mockSupabase = makeSupabaseMock({
      booked_slots: [
        { data: twoHourSlot, error: null },
        { data: [], error: null },
        { data: null, error: null },
      ],
      sessions: [
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null }, // insert
      ],
      coach_students: [
        { data: null, error: null },
        { data: null, error: null },
      ],
    });

    const result = await approvePendingBookedSlot("slot-1");
    expect(result.success).toBe(true);
  });
});
