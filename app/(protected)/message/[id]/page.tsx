import { getCurrentUser } from "@/utils/supabase/lib/getCurrentUser";
import { ConversationClient } from "./_client";
import { createClient } from "@/utils/supabase/server";

// Component rendering coach page chat-box when a contact is selected
export default async function CoachConversationPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params; // Get the contactId from slug
    const user = await getUser(); // Get the user account from supabase public schema

    // Throw error if no account is associated with user-id exists
    if (!user) {
        throw new Error("User not found");
    }

    // Retrieve conversation between current user, and selected contact
    const conversation = await getConversation(user.id, id);
    // Retrieve messages from the conversation
    const messages = await getMessages(conversation.conversationId);

    return (
        <ConversationClient
            conversation={{
                id: conversation.conversationId,
            }}
            user={{
                id: user.id,
                name: user.email, // Using email as name since account table doesn't have a name field
            }}
            messages={messages}
        />
    );
}

/**
 * Retrieve the account associated with the logged-in user
 * @returns An object containing logged-in user's id, and email
 */
async function getUser() {
    const user = await getCurrentUser();
    const supabase = await createClient();

    if (user == null) return null;

    // Query for public.account associated with auth.user
    const { data, error } = await supabase
        .from("account")
        .select("id, email")
        .eq("id", user.id)
        .single();

    if (error) return null;
    return data;
}

/**
 * Retrieves or creates a conversation between a user (coach) and a contact (student).
 *
 * This function looks for an existing conversation where:
 * - The user is the sender and the contact is the recipient, OR
 * - The contact is the sender and the user is the recipient
 *
 * @param userId - The ID of the current user (coach)
 * @param id - The ID of the contact (student)
 * @returns An object containing the conversation id
 * @throws Error if the database query fails
 */
async function getConversation(userId: string, id: string) {
    const supabase = await createClient();

    // Query for existing conversation between user and contact
    const { data, error } = await supabase
        .from("conversations")
        .select("id")
        .or(
            `and(sender_id.eq.${userId},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${userId})`,
        )
        .single();

    if (error && error.code !== "PGRST116") {
        // PGRST116 = "no rows found", which is expected if no conversation exists
        console.error("Error fetching conversation:", error);
        throw error;
    }

    // If conversation exists, return it
    if (data) {
        return {
            conversationId: data.id,
        };
    }

    // If no conversation exists, create a new one
    const { data: newConversation, error: insertError } = await supabase
        .from("conversations")
        .insert({
            sender_id: userId,
            recipient_id: id,
        })
        .select("id")
        .single();

    if (insertError) {
        console.error("Error creating conversation:", insertError);
        throw insertError;
    }

    return {
        conversationId: newConversation.id,
    };
}

/**
 * Retrieves all messages for a given conversation ID.
 *
 * @param conversationId - The ID of the conversation to fetch messages for
 * @returns Array of messages formatted for the ConversationClient component
 */
async function getMessages(conversationId: string) {
    const supabase = await createClient();

    // Query messages with sender account information
    const { data, error } = await supabase
        .from("messages")
        .select(
            `
      id,
      body,
      created_at,
      sender_id,
      sender:account!messages_sender_id_fkey(email)
    `,
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching messages:", error);
        return [];
    }

    // Transform the data to match the Message type
    return data.map((message) => ({
        id: message.id,
        text: message.body, // Map 'body' from DB to 'text' for Message type
        created_at: message.created_at,
        sender_id: message.sender_id,
        sender: {
            name: message.sender?.email || "Unknown", // Using email as name
        },
    }));
}