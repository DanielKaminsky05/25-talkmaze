"use server";

import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import { createClient } from "@/src/services/supabase/server";
import { getActiveProfile } from "@/src/lib/profiles/server/getActiveProfile";
import { assertConversationParticipant } from "../server/assertConversationParticipant";
import type { Message } from "../types";

/**
 * Sends a message into a conversation on behalf of the current user.
 *
 * Authorizes that the caller is a participant of the conversation (via
 * assertConversationParticipant) before inserting, since RLS is off in
 * production. Resolves the sender's display name/avatar from the active family
 * profile, or from the coach record when there is no active profile.
 *
 * @param data  The message payload.
 * @param data.id  Optional client-supplied message id, used for optimistic
 *                 rendering so realtime echo can be de-duplicated. A new id
 *                 is generated when omitted.
 * @param data.text  The message body. Empty/whitespace-only text is rejected.
 * @param data.conversationId  The target conversation's id.
 * @returns `{ error: false, message }` with inserted message on success, OR 
 *          `{ error: true, message }` with a human-readable reason on failure
 *          (not authenticated, empty text, not a participant, or insert error)
 */
export async function sendMessage(data: {
  id?: string;
  text: string;
  conversationId: string;
}): Promise<
  { error: false; message: Message } | { error: true; message: string }
> {
  const user = await getCurrentUser();

  if (user == null) {
    return { error: true, message: "User not authenticated." };
  }

  if (!data.text.trim()) {
    return { error: true, message: "Message cannot be empty" };
  }

  const supabase = await createClient();

  // RLS is off in prod, so this is the only check stopping a caller writing
  // a conversation they don't belong to. Must run before the insert.
  const isParticipant = await assertConversationParticipant(
    supabase,
    user.id,
    data.conversationId,
  );
  if (!isParticipant) {
    return { error: true, message: "Forbidden" };
  }

  const { data: insertedMessage, error } = await supabase
    .from("messages")
    .insert({
      ...(data.id ? { id: data.id } : {}),
      body: data.text,
      conversation_id: data.conversationId,
      sender_id: user.id,
    })
    .select("id, body, created_at, sender_id")
    .single();

  if (error) {
    console.error("Error inserting message:", error);
    return { error: true, message: "Failed to send message" };
  }

  const profile = await getActiveProfile();
  let senderName = "Unknown";
  let avatarUrl: string | null = null;

  if (profile) {
    if (profile.type === "student") {
      const { data: student } = await supabase
        .from("students")
        .select("first_name, last_name, avatar_url")
        .eq("id", profile.id)
        .maybeSingle();
      if (student) {
        senderName =
          `${student.first_name || ""} ${student.last_name || ""}`.trim();
        avatarUrl = student.avatar_url ?? null;
      }
    } else {
      const { data: parent } = await supabase
        .from("parents")
        .select("first_name, last_name, avatar_url")
        .eq("id", profile.id)
        .maybeSingle();
      if (parent) {
        senderName =
          `${parent.first_name || ""} ${parent.last_name || ""}`.trim();
        avatarUrl = parent.avatar_url ?? null;
      }
    }
  } else {
    const { data: coach } = await supabase
      .from("coaches")
      .select("first_name, last_name, avatar_url")
      .eq("account_id", user.id)
      .maybeSingle();
    if (coach)
      senderName =
        `${coach.first_name || ""} ${coach.last_name || ""}`.trim() ||
        "Unknown";
    avatarUrl = coach?.avatar_url ?? null;
  }

  const message: Message = {
    id: insertedMessage.id,
    text: insertedMessage.body,
    created_at: insertedMessage.created_at,
    sender_id: insertedMessage.sender_id,
    sender: { name: senderName, avatar_url: avatarUrl },
  };

  return { error: false, message };
}
