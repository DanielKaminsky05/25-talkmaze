import { Message } from "@/utils/supabase/actions/messages";

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "short",
});

export default function ConversationMessage({ text, sender }: Message) {
  return (
    <div className="w-auto h-fit flex gap-3">
      <div
        className="min-w-[35px] h-10 bg-white rounded-sm border
         border-black"
      >
        <p className="text-center text-[#65CFAD]">PR</p>
      </div>
      <span className="px-1 py-2 bg-white rounded-[9px] grow">
        {sender.name}:  {text}
      </span>
    </div>
  );
}
