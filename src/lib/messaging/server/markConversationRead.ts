import "server-only";

import { createClient } from "@/src/services/supabase/server";

/**
 * Marks a conversation as read for the current family profile.
 *
 * Delegates to the `mark_conversation_read` RPC, which only updates the
 * conversation's read marker when the conversation's profile belongs to the
 * caller (auth.uid()) — so a forged active-profile cookie cannot mark another
 * family's conversation read.
 */
export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });

  if (error) {
    console.error("Error marking conversation read:", error);
  }
}
