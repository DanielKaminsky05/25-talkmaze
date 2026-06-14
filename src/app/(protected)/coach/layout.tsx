import { ReactNode } from "react";
import CoachLayoutShell from "./_components/CoachLayoutShell";
import { RescheduleProvider } from "./_context/RescheduleContext";
import { getPendingRescheduleCount } from "@/src/lib/scheduling/server/getPendingRescheduleCount";
import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import { createClient } from "@/src/services/supabase/server";
import { UnreadMessagesProvider } from "@/src/components/common/messaging/UnreadMessagesContext";
import { getCoachUnreadState } from "@/src/lib/messaging/actions/getCoachUnreadState";

/**
 * Server layout for all coach routes. Reads the coach's avatar and seeds the
 * pending reschedule-request count and unread-message counts on the server (no
 * badge flash), then renders the coach shell inside `RescheduleProvider` and
 * `UnreadMessagesProvider` so the sidebar Requests and Messages badges stay current.
 */
export default async function CoachLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  let avatarUrl: string | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("coaches")
      .select("avatar_url")
      .eq("account_id", user.id)
      .maybeSingle();
    avatarUrl = data?.avatar_url ?? null;
  }

  const [initialPendingCount, initialUnread] = await Promise.all([
    getPendingRescheduleCount(),
    user
      ? getCoachUnreadState()
      : Promise.resolve({ total: 0, byContact: {} }),
  ]);

  return (
    <RescheduleProvider initialCount={initialPendingCount}>
      <UnreadMessagesProvider
        initialUnread={initialUnread.total}
        initialUnreadByContact={initialUnread.byContact}
        topic={user ? `coach:${user.id}:unread` : null}
        fetchUnread={getCoachUnreadState}
      >
        <CoachLayoutShell avatarUrl={avatarUrl}>{children}</CoachLayoutShell>
      </UnreadMessagesProvider>
    </RescheduleProvider>
  );
}
