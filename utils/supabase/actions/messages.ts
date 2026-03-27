"use server";

import { getCurrentUser } from "../lib/getCurrentUser";
import { createClient } from "../server";

export type Message = {
  id: string;
  text: string;
  created_at: string;
  sender_id: string;
  sender: {
    name: string;
    // image_url: string;
  };
};

export async function sendMessage(data: {
  text: string;
  conversationId: string;
}): Promise<
  { error: false; message: Message } | { error: true; message: string }
> {
  const user = await getCurrentUser();

  if (user == null) {
    return { error: true, message: "User not authenticated." };
  }

  // Error reject when trimmed text is empty
  if (!data.text.trim()) {
    return { error: true, message: "Message cannot be empty" };
  }

  const supabase = await createClient();

  // Insert the message into the database. Immediately retrieve the newly
  // selected message from database to confirm success.
  const { data: insertedMessage, error } = await supabase
    .from("messages")
    .insert({
      body: data.text,
      conversation_id: data.conversationId,
      sender_id: user.id,
    })
    .select(
      `
      id,
      body,
      created_at,
      sender_id,
      sender:account!messages_sender_id_fkey(email)
    `,
    )
    .single();

  if (error) {
    console.error("Error inserting message:", error);
    return { error: true, message: "Failed to send message" };
  }

  const { data: account } = await supabase
    .from("account")
    .select("email")
    .eq("id", user.id)
    .single();

  const { data: student } = !account
    ? await supabase.from("students").select("name").eq("id", user.id).single()
    : { data: null };

  const senderName = account?.email ?? student?.name ?? "Unknown";

  const message: Message = {
    id: insertedMessage.id,
    text: insertedMessage.body,
    created_at: insertedMessage.created_at,
    sender_id: insertedMessage.sender_id,
    sender: { name: senderName },
  };

  return { error: false, message };
}
