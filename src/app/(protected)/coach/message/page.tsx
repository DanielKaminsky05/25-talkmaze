import { MessageCircleIcon } from "@/src/components/ui/icons";
import ConversationShell from "@/src/components/common/messaging/ConversationShell";
import ConversationMessageInput from "@/src/components/common/messaging/ConversationMessageInput";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Messages" };

/**
 * Empty state for /coach/message. Renders the same chatbox
 * shell as an active conversation, with a centered prompt and a disabled input
 * so the UI reads as "ready, just pick a contact" rather than blank.
 */
export default function CoachMessagePage() {
  return (
    <ConversationShell>
      <div
        className="flex flex-1 min-h-0 flex-col items-center justify-center
        gap-3 text-[#1F2E3B]/55"
      >
        <MessageCircleIcon size={48} />
        <p className="text-sm font-medium">
          Select a contact to start chatting
        </p>
      </div>
      <ConversationMessageInput
        disabled
        placeholder="Select a contact to start chatting"
      />
    </ConversationShell>
  );
}
