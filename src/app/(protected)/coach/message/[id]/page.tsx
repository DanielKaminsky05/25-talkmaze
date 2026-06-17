import { notFound } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import { createClient } from "@/src/services/supabase/server";
import { getOrCreateCoachConversation } from "@/src/lib/messaging/server/getOrCreateCoachConversation";
import { markConversationRead } from "@/src/lib/messaging/server/markConversationRead";
import { getConversationMessages } from "@/src/lib/messaging/server/getConversationMessages";
import { getCurrentSender } from "@/src/lib/messaging/server/getCurrentSender";
import { ConversationClient } from "@/src/components/common/messaging/ConversationClient";
import { getCoachContacts } from "@/src/lib/messaging/server/getCoachContacts";
import type { Metadata } from "next";

/**
 * Coach conversation page. `id` is the family profile id (student or parent).
 * Resolves (or creates) the conversation only after verifying the coach is
 * assigned to the contact, marks it read for the coach, then hydrates the
 * shared chatbox with message history.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const contact = (await getCoachContacts()).find((c) => c.id === id);
    if (!contact) return { title: "Messages" };
    const name = contact.email
      ? contact.name.replace(` (${contact.email})`, "")
      : contact.name;
    return { title: name || "Messages" };
  } catch {
    return { title: "Messages" };
  }
}

export default async function CoachConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: contactId } = await params;

  const user = await getCurrentUser();
  if (!user) notFound();

  const supabase = await createClient();

  const result = await getOrCreateCoachConversation(
    supabase,
    user.id,
    contactId,
  );

  if ("error" in result) {
    if (result.error === "internal") {
      throw new Error("Failed to load coach conversation");
    }
    // forbidden & notFound both render as 404 here: the coach only reaches
    // this link - thus 404 avoids leaking whether the profile exists.
    notFound();
  }

  const conversationId = result.conversationId;

  // Clear the coach's unread count for this conversation (coach branch of the
  // mark_conversation_read RPC).
  await markConversationRead(conversationId);

  const [messages, currentSender] = await Promise.all([
    getConversationMessages(conversationId),
    getCurrentSender(user.id, 2, null),
  ]);

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
