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

  const conversation = await getConversation(user.id, contactId, profile);
  const messages = await getMessages(
    conversation.conversationId,
    user.id,
    conversation.senderProfileId,
    conversation.senderProfileType
  );

  return (
    <ConversationClient
      conversation={{ id: conversation.conversationId }}
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
  contactId: string,
  profile: { id: string; type: "student" | "parent" } | null
) {
  const supabase = await createClient();

  const [{ data: accountExists }, { data: studentExists }] = await Promise.all([
    supabase.from("account").select("id").eq("id", contactId).single(),
    supabase.from("students").select("account_id").eq("id", contactId).single(),
  ]);

  if (!accountExists && !studentExists) {
    throw new Error("The selected contact does not exist.");
  }

  // If the contact is a student, resolve their account_id
  const resolvedContactId = studentExists?.account_id ?? contactId;

  if (profile) {
    // Regular user: look for their profile-scoped conversation first
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("sender_id", userId)
      .eq("recipient_id", resolvedContactId)
      .eq("sender_profile_id", profile.id)
      .maybeSingle();

    if (conv) {
      return {
        conversationId: conv.id,
        senderProfileId: profile.id,
        senderProfileType: profile.type,
      };
    }
  } else {
    // Coach/admin: look for any existing conversation in either direction,
    // preferring one started by the contact (so we join the student's thread).
    // Use limit(1) to safely handle multiple profile-scoped conversations from
    // the same account without maybeSingle() erroring on multiple rows.
    const [{ data: theirConvs }, { data: myConvs }] = await Promise.all([
      supabase
        .from("conversations")
        .select("id")
        .eq("sender_id", resolvedContactId)
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("conversations")
        .select("id")
        .eq("sender_id", userId)
        .eq("recipient_id", resolvedContactId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    const existing = theirConvs?.[0] ?? myConvs?.[0];
    if (existing) {
      return {
        conversationId: existing.id,
        senderProfileId: null,
        senderProfileType: null,
      };
    }
  }

  const { data: newConversation, error: insertError } = await supabase
    .from("conversations")
    .insert({
      sender_id: userId,
      recipient_id: resolvedContactId,
      ...(profile && {
        sender_profile_id: profile.id,
        sender_profile_type: profile.type,
      }),
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Error creating conversation:", insertError);
    throw insertError;
  }

  return {
    conversationId: newConversation.id,
    senderProfileId: profile?.id ?? null,
    senderProfileType: profile?.type ?? null,
  };
}

async function getMessages(
  conversationId: string,
  currentUserId: string,
  senderProfileId: string | null,
  senderProfileType: string | null
) {
  const supabase = await createClient();
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
      const { data: account } = await supabase
        .from("account")
        .select("email")
        .eq("id", m.sender_id)
        .maybeSingle();

      let name: string;

      if (m.sender_id === currentUserId && senderProfileId) {
        // Resolve the specific active profile's name
        if (senderProfileType === "student") {
          const { data: student } = await supabase
            .from("students")
            .select("name")
            .eq("id", senderProfileId)
            .maybeSingle();
          name = student?.name ?? account?.email ?? "Unknown";
        } else {
          const { data: parent } = await supabase
            .from("parents")
            .select("name")
            .eq("id", senderProfileId)
            .maybeSingle();
          name = parent?.name ?? account?.email ?? "Unknown";
        }
      } else {
        // Coach, admin, or user without active profile — resolve by account
        const { data: coach } = await supabase
          .from("coaches")
          .select("name")
          .eq("account_id", m.sender_id)
          .maybeSingle();
        name = coach?.name ?? account?.email ?? "Unknown";
      }

      return {
        id: m.id,
        text: m.body,
        created_at: m.created_at,
        sender_id: m.sender_id,
        sender: {
          name,
          email: account?.email ?? "",
        },
      };
    })
  );

  return messages;
}
