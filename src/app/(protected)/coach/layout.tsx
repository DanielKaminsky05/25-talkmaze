import { ReactNode } from "react";
import CoachLayoutShell from "./_components/CoachLayoutShell";
import { RescheduleProvider } from "./_context/RescheduleContext";
import { getPendingRescheduleCount } from "@/src/lib/scheduling/server/getPendingRescheduleCount";
import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import { createClient } from "@/src/services/supabase/server";

/**
 * Server layout for all coach routes. Reads the coach's avatar and seeds the
 * pending reschedule-request count on the server (no badge flash), then renders
 * the coach shell inside `RescheduleProvider` so the sidebar Requests badge
 * stays current.
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

  const initialPendingCount = await getPendingRescheduleCount();

  return (
    <RescheduleProvider initialCount={initialPendingCount}>
      <CoachLayoutShell avatarUrl={avatarUrl}>{children}</CoachLayoutShell>
    </RescheduleProvider>
  );
}
