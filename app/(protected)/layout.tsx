import { ReactNode } from "react";
import ProtectedLayoutShell from "./components/ProtectedLayoutShell";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";

/**
 * Server-side rendered layout for all protected routes
 *
 * Runs on the server so it can read the active profile cookie via
 * getActiveProfile() and determine the profile type ("student" | "parent")
 * before any client component renders. This avoids each child component
 * having to fetch the profile independently
 *
 * profileType is passed down to ProtectedLayoutShell, which forwards it
 * to SideBar and NavigationBar so they can render role-specific UI.
 */
export default async function Layout({ children }: { children: ReactNode }) {
  const activeProfile = await getActiveProfile();

  // Fall back to "student" if no active profile cookie is set
  const profileType = activeProfile?.type ?? "student";

  return (
    <ProtectedLayoutShell profileType={profileType}>
      {children}
    </ProtectedLayoutShell>
  );
}
