"use client";
import { Message } from "@/utils/supabase/actions/messages";
import ConversationMessage from "../../components/coach-page/ConversationMessage";
import ConversationMessageInput from "../../components/coach-page/ConversationMessageInput";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

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

  const visibleMessages = messages.concat(realTimeMessages);

  return (
    <div
      className="flex flex-col gap-4 w-full h-full min-h-0 overflow-hidden
       bg-[#c0f7e5] px-3 py-5 rounded-xl
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
            <ConversationMessage key={message.id} {...message} />
          ))}
        </div>
      </div>
      {/* Send Message Input */}
      <ConversationMessageInput conversationId={conversation.id} />
    </div>
  );
}

/**
 * Set up subscription to a Supabase realtime channel.
 * Listen to broadcasts that are triggered when a message is added to Supabase
 * messages table.
 */
function useRealtimeChat({
  roomId,
}: {
  roomId: string;
  userId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let newChannel: RealtimeChannel;
    let cancel = false;

    supabase.realtime.setAuth().then(() => {
      if (cancel) return;

      newChannel = supabase.channel(`room:${roomId}:messages`, {
        config: {
          private: false, // TODO: implement so that it works with private channels
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
