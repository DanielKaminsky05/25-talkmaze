import { ReactNode } from "react";
import FamiliesLayoutShell from "./_components/FamiliesLayoutShell";
import { getActiveProfile } from "@/src/lib/profiles/server/getActiveProfile";
import { getProfileUnreadTotal } from "@/src/lib/messaging/server/getProfileUnreadTotal";
import { getProfileUnreadByContact } from "@/src/lib/messaging/server/getProfileUnreadByContact";
import { createClient } from "@/src/services/supabase/server";

/**
 * Server-side rendered layout for all (families) routes
 *
 * Runs on the server so it can read the active profile cookie via
 * getActiveProfile() and determine the profile type ("student" | "parent")
 * before any client component renders. This avoids each child component
 * having to fetch the profile independently
 *
 * profileType and avatarUrl are passed down to FamiliesLayoutShell, which
 * forwards them to SideBar and NavigationBar so they can render role-specific 
 * UI.
 */
export default async function Layout({ children }: { children: ReactNode }) {
  const activeProfile = await getActiveProfile();

  // Fall back to "student" if no active profile cookie is set
  const profileType = activeProfile?.type ?? "student";

  let avatarUrl: string | null = null;

  if (activeProfile) {
    const supabase = await createClient();
    const table = activeProfile.type === "parent" ? "parents" : "students";
    const { data } = await supabase
      .from(table)
      .select("avatar_url")
      .eq("id", activeProfile.id)
      .single();
    avatarUrl = data?.avatar_url ?? null;
  }

  // Seed the sidebar unread badge and the message page's unread-contacts list
  // from the server so they render without a flash
  const [initialUnread, initialUnreadByContact] = activeProfile
    ? await Promise.all([
        getProfileUnreadTotal(activeProfile.id, activeProfile.type),
        getProfileUnreadByContact(activeProfile.id, activeProfile.type),
      ])
    : [0, {}];

  return (
    <FamiliesLayoutShell
      profileType={profileType}
      avatarUrl={avatarUrl}
      activeProfile={activeProfile}
      initialUnread={initialUnread}
      initialUnreadByContact={initialUnreadByContact}
    >
      {children}
    </FamiliesLayoutShell>
  );
}
