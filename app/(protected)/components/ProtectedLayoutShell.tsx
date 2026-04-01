"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import NavigationBar from "./NavigationBar";
import SideBar from "./Sidebar";

type Props = {
  profileType: "student" | "parent";
  children: ReactNode;
};

/**
 * Client shell for the protected layout.
 *
 * This component exists to separate two concerns:
 *   - The server layout (layout.tsx) reads the active profile cookie and
 *     determines profileType server-side.
 *   - This shell receives profileType as a prop and handles the client-side
 *     logic (usePathname) that decides whether to show the sidebar/navbar frame
 *
 * Routes like /profiles, /admin, and /coach bypass the frame entirely and
 * render their children full-screen (no navbar, sidebar)
 */
export default function ProtectedLayoutShell({ profileType, children }: Props) {
  const pathname = usePathname();

  // These routes manage their own full-screen layout; skip the sidebar/navbar
  if (
    pathname?.startsWith("/profiles") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/coach")
  ) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-row w-screen h-screen overflow-hidden">
      <SideBar profileType={profileType} />
      <div className="flex flex-1 flex-col overflow-y-auto pr-6">
        <NavigationBar profileType={profileType} />
        <div className="bg-[#1f2e3b] w-full flex-1 min-w-[300px] rounded-2xl shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)] mb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
