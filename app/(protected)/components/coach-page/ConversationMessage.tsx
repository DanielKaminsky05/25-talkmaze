import { Message } from "@/utils/supabase/actions/messages";
import { User2Icon } from "lucide-react";
import Image from "next/image";

/**
 * Date formatter for message timestamps
 */
const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "short",
});

/**
 * Component for an individual message
 */
export default function ConversationMessage({
  text,
  sender,
  created_at,
  status,
}: Message & { status?: "pending" | "error" | "success" }) {
  return (
    // The container of the user profile image and the message contents
    <div className={[
      "w-auto h-fit flex gap-3",
      status === "pending" ? "opacity-70" : "",
      status === "error" ? "bg-red-50 text-red-600 rounded-lg px-2" : "",
    ].join(" ")}>
      {/* Profile Image */}
      {sender.avatar_url ? (
        <div className="relative min-w-[35px] h-10 rounded-sm overflow-hidden border bg-gray-300">
          <Image src={sender.avatar_url} alt={sender.name} fill className="object-cover" />
        </div>
      ) : (
        <User2Icon className="min-w-[35px] h-10 rounded-sm border bg-gray-300" />
      )}
      {/* Message contents (username, timestamp, text, etc.) */}
      <div className="px-1 pt-1 pb-2 bg-white rounded-[9px] grow">
        <div className="flex items-baseline gap-2 justify-between">
          <span className="text-sm font-semibold">
            {sender.name}
          </span>
          <span className="text-sm text-muted-foreground truncate">
            {DATE_FORMATTER.format(new Date(created_at))}
          </span>
        </div>
        <p className="whitespace-pre-wrap break-words leading-5 m-0">{text}</p>
      </div>
    </div>
  );
}
