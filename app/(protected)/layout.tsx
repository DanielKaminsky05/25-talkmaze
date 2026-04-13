import { ReactNode } from "react";
import ProtectedLayoutShell from "./components/ProtectedLayoutShell";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";
import { createClient } from "@/utils/supabase/server";

/**
 * Server-side rendered layout for all protected routes
 *
 * Runs on the server so it can read the active profile cookie via
 * getActiveProfile() and determine the profile type ("student" | "parent")
 * before any client component renders. This avoids each child component
 * having to fetch the profile independently
 *
 * profileType and avatarUrl are passed down to ProtectedLayoutShell, which
 * forwards them to SideBar and NavigationBar so they can render role-specific UI.
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

  return (
    <ProtectedLayoutShell profileType={profileType} avatarUrl={avatarUrl}>
      {children}
    </ProtectedLayoutShell>
  );
}
