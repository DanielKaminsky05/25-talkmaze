import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/services/supabase/types/database";

/**
 * Returns true when `userId` is a participant of the conversation: either the
 * conversation's coach (matched by the coach's account id) or the owner of the
 * conversation's family profile (the student/parent row's `account_id`).
 *
 * RLS is disabled in production, so this handler-level check is the security
 * boundary that stops a caller writing into a conversation they don't belong 
 * to (see `docs/api-contract.md`). 
 * 
 * Returns false on any lookup error or when the conversation does not exist.
 */
export async function assertConversationParticipant(
  supabase: SupabaseClient<Database>,
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const { data: conv, error } = await supabase
    .from("conversations")
    .select("coach_id, profile_id, profile_type")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    console.error("assertConversationParticipant conversation lookup", error);
    return false;
  }
  if (!conv) return false;

  // Caller is the conversation's coach.
  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id")
    .eq("id", conv.coach_id)
    .eq("account_id", userId)
    .maybeSingle();

  if (coachError) {
    console.error("assertConversationParticipant coach lookup", coachError);
    return false;
  }
  if (coach) return true;

  // Caller owns the conversation's family profile.
  const profileTable = conv.profile_type === "parent" ? "parents" : "students";
  const { data: profile, error: profileError } = await supabase
    .from(profileTable)
    .select("id")
    .eq("id", conv.profile_id)
    .eq("account_id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("assertConversationParticipant profile lookup", profileError);
    return false;
  }

  return Boolean(profile);
}
