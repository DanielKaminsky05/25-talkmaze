import { getCurrentUser } from "@/utils/supabase/lib/getCurrentUser";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";
import { ConversationClient } from "./_client";
import { createClient } from "@/utils/supabase/server";

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

  const conversationId = await getConversation(user.id, user.role, contactId, profile);
  const messages = await getMessages(conversationId);

  return (
    <ConversationClient
      conversation={{ id: conversationId }}
      user={{ id: user.id, name: user.email }}
      messages={messages}
    />
  );
}

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

async function getConversation(
  userId: string,
  userRole: number,
  contactId: string,
  profile: { id: string; type: "student" | "parent" } | null,
): Promise<string> {
  const supabase = await createClient();

  if (userRole === 1 && profile) {
    // Regular user: contactId is a coach's account_id — resolve their coaches.id
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
      .insert({ coach_id: coach.id, profile_id: profile.id, profile_type: profile.type })
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
        { coach_id: coach.id, profile_id: contactId, profile_type: profileType },
        { onConflict: "coach_id,profile_id" },
      )
      .select("id")
      .single();

    if (error) throw error;
    return conv.id;
  }
}

async function getMessages(conversationId: string) {
  const supabase = await createClient();

  // Fetch conversation to know coach_id and profile_id/type
  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .select("coach_id, profile_id, profile_type")
    .eq("id", conversationId)
    .single();

  if (convError || !conv) {
    console.error("Error fetching conversation:", convError);
    return [];
  }

  // Resolve the coach's account_id so we can identify coach messages
  const { data: coach } = await supabase
    .from("coaches")
    .select("account_id, first_name, last_name, avatar_url")
    .eq("id", conv.coach_id)
    .single();

  const { data, error } = await supabase
    .from("messages")
    .select("id, body, created_at, sender_id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  const messages = await Promise.all(
    data.map(async (m) => {
      let name: string;
      let avatar_url: string | null = null;

      if (coach && m.sender_id === coach.account_id) {
        // Sender is the coach
        name = `${coach.first_name || ""} ${coach.last_name || ""}`.trim() || "Unknown";
        avatar_url = coach.avatar_url ?? null;
      } else {
        // Sender is the user profile
        if (conv.profile_type === "student") {
          const { data: student } = await supabase
            .from("students")
            .select("first_name, last_name, avatar_url")
            .eq("id", conv.profile_id)
            .maybeSingle();
          name = student
            ? `${student.first_name || ""} ${student.last_name || ""}`.trim()
            : "Unknown";
          avatar_url = student?.avatar_url ?? null;
        } else {
          const { data: parent } = await supabase
            .from("parents")
            .select("first_name, last_name, avatar_url")
            .eq("id", conv.profile_id)
            .maybeSingle();
          name = parent
            ? `${parent.first_name || ""} ${parent.last_name || ""}`.trim()
            : "Unknown";
          avatar_url = parent?.avatar_url ?? null;
        }
      }

      return {
        id: m.id,
        text: m.body,
        created_at: m.created_at,
        sender_id: m.sender_id,
        sender: { name, avatar_url },
      };
    }),
  );

  return messages;
}
