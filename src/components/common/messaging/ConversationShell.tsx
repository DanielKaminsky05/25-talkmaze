import { ReactNode } from "react";

/**
 * Presentational shell for the chatbox: the green patterned container that
 * frames both an active conversation and the empty "no contact selected" state
 * Keeps the container styling in one place so the two states can't drift apart
 */
export default function ConversationShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-4 w-full h-full min-h-0 overflow-hidden
       bg-[#B1E7D6] bg-[url('/images/backgrounds/pipes-pattern-bg.png')]
       bg-size-[400px_400px] bg-repeat bg-blend-multiply
       px-3 lg:px-6 xl:px-12 py-5 rounded-xl
       shadow-[inset_0_2px_5px_rgba(0,0,0,0.6)]"
    >
      {children}
    </div>
  );
}
