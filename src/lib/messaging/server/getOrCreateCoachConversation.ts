import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/services/supabase/types/database";

export type CoachConversationResult =
  | { conversationId: string }
  | { error: "forbidden" | "notFound" | "internal" };

/**
 * Finds or creates the conversation between the calling coach and a contact
 * (a student or parent profile), enforcing that the coach is assigned to the
 * student or to a student in the parent's family, before creating anything.
 *
 * @param supabase  Server Supabase client (carries the caller's auth)
 * @param coachUserId  The calling coach's account id (`auth.uid()`); resolved
 *                     to their `coaches.id` for the assignment checks.
 * @param contactId  The contact's family profile id, a `students.id` or a
 *                   `parents.id`.
 * @returns `{ conversationId }` on success, or `{ error }` where:
 *          `"forbidden"` = the coach isn't assigned to this student/family,
 *          `"notFound"` = `contactId` is neither a student nor a parent, and
 *          `"internal"` = a lookup/upsert failed or the coach row is missing
 */
export async function getOrCreateCoachConversation(
  supabase: SupabaseClient<Database>,
  coachUserId: string,
  contactId: string,
): Promise<CoachConversationResult> {
  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id")
    .eq("account_id", coachUserId)
    .maybeSingle();

  if (coachError) {
    console.error("getOrCreateCoachConversation coach lookup", coachError);
    return { error: "internal" };
  }
  if (!coach) {
    console.error("getOrCreateCoachConversation: role=2 but no coaches row", {
      coachUserId,
    });
    return { error: "internal" };
  }

  let profileType: "student" | "parent";

  const { data: studentAssignment, error: studentAssignmentError } =
    await supabase
      .from("coach_students")
      .select("student_id")
      .eq("coach_id", coach.id)
      .eq("student_id", contactId)
      .maybeSingle();

  if (studentAssignmentError) {
    console.error(
      "getOrCreateCoachConversation student assignment",
      studentAssignmentError,
    );
    return { error: "internal" };
  }

  if (studentAssignment) {
    profileType = "student";
  } else {
    // Not an assigned student. Classify the contact: existing-but-unassigned
    // student stays forbidden; otherwise try the parent-in-family path.
    const { data: studentProfile, error: studentLookupError } = await supabase
      .from("students")
      .select("id")
      .eq("id", contactId)
      .maybeSingle();

    if (studentLookupError) {
      console.error(
        "getOrCreateCoachConversation student lookup",
        studentLookupError,
      );
      return { error: "internal" };
    }
    if (studentProfile) return { error: "forbidden" };

    const { data: parentProfile, error: parentLookupError } = await supabase
      .from("parents")
      .select("account_id")
      .eq("id", contactId)
      .maybeSingle();

    if (parentLookupError) {
      console.error(
        "getOrCreateCoachConversation parent lookup",
        parentLookupError,
      );
      return { error: "internal" };
    }
    if (!parentProfile) return { error: "notFound" };

    const { data: familyStudents, error: familyStudentsError } = await supabase
      .from("students")
      .select("id")
      .eq("account_id", parentProfile.account_id);

    if (familyStudentsError) {
      console.error(
        "getOrCreateCoachConversation family students",
        familyStudentsError,
      );
      return { error: "internal" };
    }

    const familyStudentIds = (familyStudents ?? []).map((s) => s.id);
    if (familyStudentIds.length === 0) return { error: "forbidden" };

    const { data: assignment, error: assignmentError } = await supabase
      .from("coach_students")
      .select("student_id")
      .eq("coach_id", coach.id)
      .in("student_id", familyStudentIds)
      .limit(1)
      .maybeSingle();

    if (assignmentError) {
      console.error(
        "getOrCreateCoachConversation parent ownership",
        assignmentError,
      );
      return { error: "internal" };
    }
    if (!assignment) return { error: "forbidden" };

    profileType = "parent";
  }

  const { data: conv, error: upsertError } = await supabase
    .from("conversations")
    .upsert(
      { coach_id: coach.id, profile_id: contactId, profile_type: profileType },
      { onConflict: "coach_id,profile_id" },
    )
    .select("id")
    .single();

  if (upsertError || !conv) {
    console.error("getOrCreateCoachConversation upsert", upsertError);
    return { error: "internal" };
  }

  return { conversationId: conv.id };
}
