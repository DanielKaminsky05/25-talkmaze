import "server-only";

import { createClient } from "@/src/services/supabase/server";
import type { Message } from "../types";

/**
 * Loads a conversation's messages in chronological order, each enriched with 
 * its sender's display name and avatar.
 *
 * A conversation has exactly one coach and one family profile, so the two
 * possible senders are resolved once up front and applied in memory
 *
 * @param conversationId  The conversation's id (`conversations.id`).
 * @returns The conversation's messages oldest-first, each with a resolved
 *          `sender` (`name` falls back to `"Unknown"`, `avatar_url` is `null`
 *          when unset). Returns `[]` if the conversation or its messages can't
 *          be loaded.
 */
export async function getConversationMessages(
  conversationId: string,
): Promise<Message[]> {
  const supabase = await createClient();

  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .select("coach_id, profile_id, profile_type")
    .eq("id", conversationId)
    .single();

  if (convError || !conv) {
    console.error("Error fetching conversation:", convError);
    return [];
  }

  // The coach is identified by their account id (= messages.sender_id when the
  // coach is the sender).
  const { data: coach } = await supabase
    .from("coaches")
    .select("account_id, first_name, last_name, avatar_url")
    .eq("id", conv.coach_id)
    .single();

  // Resolve the family profile's display info once (the only other sender).
  const profileTable = conv.profile_type === "parent" ? "parents" : "students";
  const { data: profile } = await supabase
    .from(profileTable)
    .select("first_name, last_name, avatar_url")
    .eq("id", conv.profile_id)
    .maybeSingle();

  const coachSender = {
    name:
      `${coach?.first_name || ""} ${coach?.last_name || ""}`.trim() ||
      "Unknown",
    avatar_url: coach?.avatar_url ?? null,
  };
  const profileSender = {
    name:
      `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
      "Unknown",
    avatar_url: profile?.avatar_url ?? null,
  };

  const { data, error } = await supabase
    .from("messages")
    .select("id, body, created_at, sender_id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return data.map((m) => ({
    id: m.id,
    text: m.body,
    created_at: m.created_at,
    sender_id: m.sender_id,
    sender:
      coach && m.sender_id === coach.account_id ? coachSender : profileSender,
  }));
}
