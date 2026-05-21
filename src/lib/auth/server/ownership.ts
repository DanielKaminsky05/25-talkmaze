import { NextResponse } from "next/server";
import type { AuthContext } from "./requireRole";
import type { Database } from "@/src/services/supabase/types/database";

type ConversationRow = Pick<
  Database["public"]["Tables"]["conversations"]["Row"],
  "id" | "coach_id" | "profile_id" | "profile_type"
>;

type SessionRow = Pick<
  Database["public"]["Tables"]["sessions"]["Row"],
  "id" | "coach_id" | "student_id"
>;

/**
 * Verifies the calling family account owns `studentId`.
 * Returns the student row on success, or a `NextResponse` (404 / 403) on failure.
 */
export async function assertOwnsStudent(
  { supabase, user }: AuthContext,
  studentId: string,
): Promise<{ student: { id: string; account_id: string } } | NextResponse> {
  const { data: student } = await supabase
    .from("students")
    .select("id, account_id")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  if (student.account_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { student: { id: student.id, account_id: student.account_id } };
}

/**
 * Verifies the calling coach is assigned to `studentId` via `coach_students`.
 * Returns the coach + student IDs on success, or a `NextResponse` (500 / 403) on failure.
 */
export async function assertCoachAssignedToStudent(
  { supabase, user }: AuthContext,
  studentId: string,
): Promise<{ coachId: string; studentId: string } | NextResponse> {
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("account_id", user.id)
    .maybeSingle();

  if (!coach) {
    console.error(
      "assertCoachAssignedToStudent: role=2 but no coaches row",
      { userId: user.id },
    );
    return NextResponse.json(
      { error: "Coach record missing" },
      { status: 500 },
    );
  }

  const { data: assignment } = await supabase
    .from("coach_students")
    .select("coach_id")
    .eq("coach_id", coach.id)
    .eq("student_id", studentId)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { coachId: coach.id, studentId };
}

/**
 * Verifies the calling coach owns `conversationId`.
 * Returns the conversation on success, or a `NextResponse` (500 / 404 / 403) on failure.
 */
export async function assertCoachOwnsConversation(
  { supabase, user }: AuthContext,
  conversationId: string,
): Promise<{ conversation: ConversationRow } | NextResponse> {
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("account_id", user.id)
    .maybeSingle();

  if (!coach) {
    console.error(
      "assertCoachOwnsConversation: role=2 but no coaches row",
      { userId: user.id },
    );
    return NextResponse.json(
      { error: "Coach record missing" },
      { status: 500 },
    );
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, coach_id, profile_id, profile_type")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }
  if (conv.coach_id !== coach.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { conversation: conv };
}

/**
 * Verifies the calling coach owns `sessionId` (the integer PK of `sessions`).
 * Because `sessions.id` is a sequential bigint, the contract uses 404 for BOTH
 * "doesn't exist" and "exists but not yours" to prevent ID enumeration
 * (docs/api-ownership.md:170-178). Returns the session on success.
 */
export async function assertCoachOwnsSession(
  { supabase, user }: AuthContext,
  sessionId: number,
): Promise<{ session: SessionRow } | NextResponse> {
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("account_id", user.id)
    .maybeSingle();

  if (!coach) {
    console.error(
      "assertCoachOwnsSession: role=2 but no coaches row",
      { userId: user.id },
    );
    return NextResponse.json(
      { error: "Coach record missing" },
      { status: 500 },
    );
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, coach_id, student_id")
    .eq("id", sessionId)
    .maybeSingle();

  // 404 for both "doesn't exist" AND "exists but not yours" — prevents
  // enumeration of sequential session IDs (api-ownership.md:170-178).
  if (!session || session.coach_id !== coach.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return { session };
}
