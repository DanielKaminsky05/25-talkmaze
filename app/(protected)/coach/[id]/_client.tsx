"use client";
import { Message } from "@/utils/supabase/actions/messages";
import ConversationMessage from "../../components/coach-page/ConversationMessage";
import ConversationMessageInput from "../../components/coach-page/ConversationMessageInput";

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
  return (
    <div
      className="flex flex-col gap-4 w-full h-auto bg-[#c0f7e5] px-3 py-5
        rounded-xl shadow-[inset_0_2px_5px_rgba(0,0,0,0.6)]"
    >
      {/* Messages Display */}
      <div>
        {messages.map((message) => (
          <ConversationMessage key={message.id} {...message} />
        ))}
      </div>
      {/* Send Message Input */}
      <ConversationMessageInput conversationId={conversation.id} />
    </div>
  );
}
