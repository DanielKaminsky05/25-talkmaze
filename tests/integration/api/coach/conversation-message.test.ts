/**
 * Ownership tests for GET /api/coach/conversation/message.
 *
 * Role-gate assertions live in tests/integration/api/_auth-matrix.test.ts.
 *
 * Audit: route lets any coach read any conversation. Wrong-coach test is RED
 * until `assertCoachOwnsConversation` lands.
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

import { GET as conversationMsgGET } from "@/src/app/api/coach/conversation/message/route";

let ownerCoachCookies: string;
let otherCoachCookies: string;
let ownConversationId: string;

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "bypass" });

  const { account: ownerAccount, coach: ownerCoach } = await createCoach();
  const familyAccount = await createAccount({ role: 1 });
  const assignedStudent = await createStudent(familyAccount);
  await linkCoachToStudent(ownerCoach, assignedStudent);
  ownerCoachCookies = await signSessionFor(ownerAccount);

  const { account: otherAccount } = await createCoach();
  otherCoachCookies = await signSessionFor(otherAccount);

  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: ownConv } = await adminDb
    .from("conversations")
    .insert({
      coach_id: ownerCoach.id,
      profile_id: assignedStudent.id,
      profile_type: "student",
    })
    .select()
    .single();
  ownConversationId = ownConv!.id;
});

afterAll(() => server.close());

describe("GET /api/coach/conversation/message — ownership", () => {
  it("returns 403 when a coach reads messages from a conversation they don't own (AUDIT: currently 200)", async () => {
    const res = await call(conversationMsgGET, {
      cookies: otherCoachCookies,
      query: { conversationId: ownConversationId },
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 for the coach who owns the conversation", async () => {
    const res = await call(conversationMsgGET, {
      cookies: ownerCoachCookies,
      query: { conversationId: ownConversationId },
    });
    expect(res.status).toBe(200);
  });
});
