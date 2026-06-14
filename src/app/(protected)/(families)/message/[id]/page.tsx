import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import { getActiveProfile } from "@/src/lib/profiles/server/getActiveProfile";
import { markConversationRead } from "@/src/lib/messaging/server/markConversationRead";
import { getConversationMessages } from "@/src/lib/messaging/server/getConversationMessages";
import { getCurrentSender } from "@/src/lib/messaging/server/getCurrentSender";
import { ConversationClient } from "@/src/components/common/messaging/ConversationClient";
import { createClient } from "@/src/services/supabase/server";

/**
 * Renders a conversation page for the given contact.
 * Resolves the current account, scopes by active profile for role=1 users,
 * ensures a conversation exists, and loads message history for the client UI.
 */
export default async function CoachConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const contactId = resolvedParams.id;
  if (!contactId) throw new Error("No contact ID provided");

  const user = await getUser();
  if (!user) throw new Error("User not found");

  // Only scope conversations to the active profile for regular users (role=1)
  const profile = user.role === 1 ? await getActiveProfile() : null;

  const conversationId = await getConversation(
    user.id,
    user.role,
    contactId,
    profile,
  );

  // Opening the conversation clears its unread count for the family viewer.
  // The RPC authorizes via auth.uid(), so no profile id needs to be passed.
  if (user.role === 1) {
    await markConversationRead(conversationId);
  }

  const messages = await getConversationMessages(conversationId);
  const currentSender = await getCurrentSender(user.id, user.role, profile);

  return (
    <ConversationClient
      conversation={{ id: conversationId }}
      user={{
        id: user.id,
        name: currentSender.name,
        avatar_url: currentSender.avatar_url,
      }}
      messages={messages}
    />
  );
}

/**
 * Get the authenticated account row with role information.
 * @returns Account row as an object
 *          NULL when there is no active auth session or account lookup fails.
 */
async function getUser() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account")
    .select("id, email, role")
    .eq("id", user.id)
    .single();

  if (error) return null;
  return data;
}

/**
 * Finds or creates a conversation between a coach and a profile.
 * For role=1 users, contactId is a coach account_id and profile comes from
 * the active profile context. For coach/admin users, contactId is treated as
 * a student/parent profile id and the conversation is upserted.
 */
async function getConversation(
  userId: string,
  userRole: number,
  contactId: string,
  profile: { id: string; type: "student" | "parent" } | null,
): Promise<string> {
  const supabase = await createClient();

  if (userRole === 1 && profile) {
    // Regular user: contactId is a coach's account_id
    const { data: coach } = await supabase
      .from("coaches")
      .select("id")
      .eq("account_id", contactId)
      .single();

    if (!coach) throw new Error("Coach not found for contact.");

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("coach_id", coach.id)
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({
        coach_id: coach.id,
        profile_id: profile.id,
        profile_type: profile.type,
      })
      .select("id")
      .single();

    if (error) throw error;
    return newConv.id;
  } else {
    // Coach/admin: contactId is a student or parent profile ID — resolve own coaches.id
    const { data: coach } = await supabase
      .from("coaches")
      .select("id")
      .eq("account_id", userId)
      .single();

    if (!coach) throw new Error("Coach record not found for current user.");

    // Determine profile type
    const { data: studentProfile } = await supabase
      .from("students")
      .select("id")
      .eq("id", contactId)
      .maybeSingle();

    const profileType = studentProfile ? "student" : "parent";

    const { data: conv, error } = await supabase
      .from("conversations")
      .upsert(
        {
          coach_id: coach.id,
          profile_id: contactId,
          profile_type: profileType,
        },
        { onConflict: "coach_id,profile_id" },
      )
      .select("id")
      .single();

    if (error) throw error;
    return conv.id;
  }
}
