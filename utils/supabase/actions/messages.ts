"use server";

import { getCurrentUser } from "../lib/getCurrentUser";
import { createClient } from "../server";
import { getActiveProfile } from "../../../app/api/lib/profile-management/getActiveProfile";
export type Message = {
  id: string;
  text: string;
  created_at: string;
  sender_id: string;
  sender: {
    name: string;
    email: string;
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

  const { data: insertedMessage, error } = await supabase
    .from("messages")
    .insert({
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

  const { data: account } = await supabase
    .from("account")
    .select("email")
    .eq("id", user.id)
    .single();

  const profile = await getActiveProfile();
  let senderName = account?.email ?? "Unknown";

  if (profile) {
    if (profile.type === "student") {
      const { data: student } = await supabase
        .from("students")
        .select("name")
        .eq("id", profile.id)
        .maybeSingle();
      if (student?.name) senderName = student.name;
    } else {
      const { data: parent } = await supabase
        .from("parents")
        .select("name")
        .eq("id", profile.id)
        .maybeSingle();
      if (parent?.name) senderName = parent.name;
    }
  } else {
    // Coach or admin - resolve name from coaches table
    const { data: coach } = await supabase
      .from("coaches")
      .select("name")
      .eq("account_id", user.id)
      .maybeSingle();
    if (coach?.name) senderName = coach.name;
  }

  const message: Message = {
    id: insertedMessage.id,
    text: insertedMessage.body,
    created_at: insertedMessage.created_at,
    sender_id: insertedMessage.sender_id,
    sender: { name: senderName, email: account?.email ?? "" },
  };

  return { error: false, message };
}
