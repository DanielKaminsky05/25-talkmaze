/**
 * Integration tests for the sendMessage server action.
 * src/lib/messaging/actions/sendMessage.ts
 *
 * The action takes { text, conversationId }, inserts a message row, then
 * resolves the sender name from whichever profile is active:
 *   - active_profile_type=student → name from students table
 *   - active_profile_type=parent  → name from parents table
 *   - no active profile           → name from coaches table (coach fallback)
 *
 * Unlike selectProfile, this action returns values — it never redirects.
 *
 * next/headers is mocked globally by integration-mocks.ts.
 * nextCookies.header drives both the Supabase session (getCurrentUser) and
 * the active-profile cookies (getActiveProfile).
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  createAccount,
  createCoach,
  createParent,
  createStudent,
} from "@tests/helpers/factories";
import { signSessionFor, ANON } from "@tests/helpers/auth";
import { nextCookies } from "@tests/helpers/nextHeadersMock";
import { sendMessage } from "@/src/lib/messaging/actions/sendMessage";
import type { Message } from "@/src/lib/messaging/types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

let coachCookies: string;       // coach session, no active-profile cookie
let studentCookies: string;     // family session + active_profile_type=student
let parentCookies: string;      // family session + active_profile_type=parent
let conversationId: string;

let expectedStudentName: string;
let expectedParentName: string;
let expectedCoachName: string;

beforeAll(async () => {
  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Coach
  const { account: coachAccount, coach } = await createCoach();
  coachCookies = await signSessionFor(coachAccount);
  expectedCoachName = `${coach.first_name} ${coach.last_name}`.trim();

  // Family account with a student and a parent profile
  const familyAccount = await createAccount({ role: 1 });
  const familyCookies = await signSessionFor(familyAccount);

  const student = await createStudent(familyAccount);
  const parent = await createParent(familyAccount);
  expectedStudentName = `${student.first_name} ${student.last_name}`.trim();
  expectedParentName = `${parent.first_name} ${parent.last_name}`.trim();

  studentCookies = `${familyCookies}; active_profile_id=${student.id}; active_profile_type=student`;
  parentCookies  = `${familyCookies}; active_profile_id=${parent.id}; active_profile_type=parent`;

  // A conversation the coach and student share
  const { data: conv, error } = await adminDb
    .from("conversations")
    .insert({
      coach_id: coach.id,
      profile_id: student.id,
      profile_type: "student",
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  conversationId = conv.id;
});

beforeEach(() => {
  nextCookies.header = "";
});

// ── Helper ────────────────────────────────────────────────────────────────────

/** Assert no error and return the message, failing the test if there is one. */
function assertSuccess(
  result: { error: false; message: Message } | { error: true; message: string },
): Message {
  if (result.error) throw new Error(`sendMessage returned error: ${result.message}`);
  return result.message;
}

// ── Authentication ────────────────────────────────────────────────────────────

describe("authentication", () => {
  it("returns error when not authenticated", async () => {
    nextCookies.header = ANON.cookies;
    const result = await sendMessage({ text: "Hello", conversationId });
    expect(result.error).toBe(true);
    if (result.error) expect(result.message).toBe("User not authenticated.");
  });
});

// ── Input validation ──────────────────────────────────────────────────────────

describe("input validation", () => {
  it("returns error when text is an empty string", async () => {
    nextCookies.header = coachCookies;
    const result = await sendMessage({ text: "", conversationId });
    expect(result.error).toBe(true);
    if (result.error) expect(result.message).toBe("Message cannot be empty");
  });

  it("returns error when text is whitespace only", async () => {
    nextCookies.header = coachCookies;
    const result = await sendMessage({ text: "   ", conversationId });
    expect(result.error).toBe(true);
    if (result.error) expect(result.message).toBe("Message cannot be empty");
  });
});

// ── Sender name resolution ────────────────────────────────────────────────────

describe("sender name — student active profile", () => {
  it("resolves sender name from the students table", async () => {
    nextCookies.header = studentCookies;
    const result = await sendMessage({ text: "Hi from student", conversationId });
    const msg = assertSuccess(result);
    expect(msg.sender.name).toBe(expectedStudentName);
  });
});

describe("sender name — parent active profile", () => {
  it("resolves sender name from the parents table", async () => {
    nextCookies.header = parentCookies;
    const result = await sendMessage({ text: "Hi from parent", conversationId });
    const msg = assertSuccess(result);
    expect(msg.sender.name).toBe(expectedParentName);
  });
});

describe("sender name — no active profile (coach fallback)", () => {
  it("resolves sender name from the coaches table when no profile cookie is set", async () => {
    nextCookies.header = coachCookies;
    const result = await sendMessage({ text: "Hi from coach", conversationId });
    const msg = assertSuccess(result);
    expect(msg.sender.name).toBe(expectedCoachName);
  });
});

// ── Returned message shape ────────────────────────────────────────────────────

describe("returned message fields", () => {
  it("message has id, text, created_at, and sender_id", async () => {
    nextCookies.header = coachCookies;
    const result = await sendMessage({ text: "Fields check", conversationId });
    const msg = assertSuccess(result);
    expect(msg.id).toBeTruthy();
    expect(msg.text).toBe("Fields check");
    expect(msg.created_at).toBeTruthy();
    expect(msg.sender_id).toBeTruthy();
  });

  it("message.text matches the input text verbatim", async () => {
    nextCookies.header = coachCookies;
    const text = "Exact text check 🎯";
    const result = await sendMessage({ text, conversationId });
    const msg = assertSuccess(result);
    expect(msg.text).toBe(text);
  });

  it("message.sender.avatar_url is null when no avatar is set", async () => {
    nextCookies.header = coachCookies;
    const result = await sendMessage({ text: "Avatar check", conversationId });
    const msg = assertSuccess(result);
    expect(msg.sender.avatar_url).toBeNull();
  });
});

// ── Cross-conversation gap (audit) ────────────────────────────────────────────

describe("conversation membership (AUDIT gap)", () => {
  it.todo(
    "returns error when the caller sends to a conversation they don't belong to " +
    "(AUDIT: currently succeeds — no membership check in sendMessage or RLS)",
  );
});
