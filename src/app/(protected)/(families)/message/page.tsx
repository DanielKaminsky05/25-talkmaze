import { MessageCircleIcon } from "@/src/components/ui/icons";
import ConversationShell from "./_components/ConversationShell";
import ConversationMessageInput from "./_components/ConversationMessageInput";

/**
 * Empty state for /message (no contact selected). Renders the same chatbox
 * shell as an active conversation, with a centered prompt and a disabled input
 * so the UI reads as "ready, just pick a contact" rather than blank.
 */
const MessagePage = () => {
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
};

export default MessagePage;
