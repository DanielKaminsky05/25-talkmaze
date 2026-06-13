"use client";
import { Message } from "@/src/lib/messaging/types";
import ConversationMessage from "../_components/ConversationMessage";
import ConversationMessageInput from "../_components/ConversationMessageInput";
import { useEffect, useState } from "react";
import { createClient } from "@/src/services/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useUnread } from "../../_context/UnreadContext";

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

  // Tell the unread provider this conversation is on screen. While it is, the
  // provider marks incoming messages read instead of counting them, so the
  // sidebar badge doesn't tick up for messages the user is actively reading.
  const { setOpenConversation } = useUnread();
  useEffect(() => {
    setOpenConversation(conversation.id);
    return () => setOpenConversation(null);
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
    <div
      className="flex flex-col gap-4 w-full h-full min-h-0 overflow-hidden
       bg-[#B1E7D6] bg-[url('/images/backgrounds/pipes-pattern-bg.png')]
       bg-size-[400px_400px] bg-repeat bg-blend-multiply
       px-3 lg:px-6 xl:px-12 py-5 rounded-xl
       shadow-[inset_0_2px_5px_rgba(0,0,0,0.6)]"
    >
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
    </div>
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
