"use client";
import { Message } from "@/src/lib/messaging/types";
import ConversationMessage from "./ConversationMessage";
import ConversationMessageInput from "./ConversationMessageInput";
import ConversationShell from "./ConversationShell";
import { useEffect, useState } from "react";
import { createClient } from "@/src/services/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useUnreadMessages } from "./UnreadMessagesContext";

/**
 * Chatbox client displaying messages between this user and the contact they
 * want to send messages to.
 *
 * Establishes a connection to the websocket of the conversation channel
 *
 * @param conversation conversation between this user and selected contact
 * @param user the current user
 * @param messages message history between this user and selected contact
 */
export function ConversationClient({
  conversation,
  user,
  messages,
}: {
  conversation: {
    id: string;
  };
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  messages: Message[];
}) {
  /**
   *  Initialize a realtime channel representing the conversation, and
   *  subscribe the current user to it.
   *
   *  Retrieves the users currently subscribed to the conversation channel.
   *
   *  Retrieves the latest messages each time a message is sent to the
   *  conversation channel.
   */
  const { messages: realTimeMessages } = useRealtimeChat({
    roomId: conversation.id,
    userId: user.id, // kept for hook signature compatibility
  });

  // Mark the conversation read and tell the unread provider it is on screen.
  // Marking happens here (not only in the route page) so that inline mounts
  // such as the coach StudentDetails chat also clear unread. The read is
  // committed before `setOpenConversation` refetches, so the now-read
  // conversation drops out of the counts without the badge ticking up.
  const { setOpenConversation } = useUnreadMessages();
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { error } = await supabase.rpc("mark_conversation_read", {
        p_conversation_id: conversation.id,
      });
      if (error) console.error("Failed to mark conversation read:", error);
      // Refetch only after the read commits, so the now-read conversation
      // drops out of the counts instead of the badge briefly ticking up.
      if (!cancelled) setOpenConversation(conversation.id);
    })();

    return () => {
      cancelled = true;
      setOpenConversation(null);
    };
  }, [conversation.id, setOpenConversation]);

  // Optimistic rendering: track messages the user sends before server confirms
  const [sentMessages, setSentMessages] = useState<
    (Message & { status: "pending" | "error" | "success" })[]
  >([]);

  const visibleMessages = messages.concat(
    realTimeMessages,
    sentMessages.filter((m) => !realTimeMessages.find((rm) => rm.id === m.id)),
  );

  return (
    <ConversationShell>
      {/* Messages Display Container */}
      <div
        className="flex flex-col-reverse flex-1 min-h-0 overflow-y-auto
        [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]
        [scrollbar-width:none]"
      >
        <div className="flex flex-col gap-2">
          {visibleMessages.map((message) => (
            <ConversationMessage
              key={message.id}
              {...message}
              status={
                "status" in message
                  ? (message as { status: "pending" | "error" | "success" })
                      .status
                  : undefined
              }
            />
          ))}
        </div>
      </div>
      {/* Send Message Input */}
      <ConversationMessageInput
        conversationId={conversation.id}
        onSend={(message) => {
          setSentMessages((prev) => [
            ...prev,
            {
              id: message.id,
              text: message.text,
              created_at: new Date().toISOString(),
              sender_id: user.id,
              sender: { name: user.name, avatar_url: user.avatar_url },
              status: "pending",
            },
          ]);
        }}
        onSuccessfulSend={(message) => {
          setSentMessages((prev) =>
            prev.map((m) =>
              m.id === message.id ? { ...message, status: "success" } : m,
            ),
          );
        }}
        onErrorSend={(id) => {
          setSentMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, status: "error" } : m)),
          );
        }}
      />
    </ConversationShell>
  );
}

/**
 * Set up subscription to a Supabase realtime channel.
 * Listen to broadcasts that are triggered when a message is added to Supabase
 * messages table.
 */
function useRealtimeChat({ roomId }: { roomId: string; userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let newChannel: RealtimeChannel;
    let cancel = false;

    supabase.realtime.setAuth().then(() => {
      if (cancel) return;

      newChannel = supabase.channel(`room:${roomId}:messages`, {
        config: {
          private: true,
        },
      });

      newChannel
        // Listen to inserts to supabase messages table
        .on("broadcast", { event: "INSERT" }, (payload) => {
          const record = payload.payload;
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: record.id,
              text: record.text,
              created_at: record.created_at,
              sender_id: record.sender_id,
              sender: {
                name: record.sender_name,
                avatar_url: record.avatar_url ?? null,
              },
            },
          ]);
        })
        .subscribe();
    });

    return () => {
      cancel = true;
      if (!newChannel) return;
      newChannel.unsubscribe();
    };
  }, [roomId]); // Run useEffect hook whenever roomId changes

  return { messages };
}
