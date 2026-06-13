"use client";

import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import FamiliesTopBar from "./navigation/FamiliesTopBar";
import FamiliesSideBar from "./navigation/FamiliesSideBar";
import { PageTitleProvider } from "../_context/PageTitleContext";
import {
  ActiveProfile,
  ActiveProfileProvider,
} from "../_context/ActiveProfileContext";
import { UnreadProvider } from "../_context/UnreadContext";

type Props = {
  profileType: "student" | "parent";
  avatarUrl: string | null;
  activeProfile: ActiveProfile | null;
  initialUnread: number;
  initialUnreadByContact: Record<string, number>;
  children: ReactNode;
};

/**
 * Client shell for the protected layout.
 *
 * This component exists to separate two concerns:
 *   - The server layout (layout.tsx) reads the active profile cookie and
 *     determines profileType server-side.
 *   - This shell receives profileType as a prop and handles client-side logic
 *     (usePathname) that decides whether to show the sidebar/navbar frame
 *
 * Routes like /profiles, /onboarding bypass the frame entirely and
 * render their children full-screen (no navbar, sidebar)
 */
export default function FamiliesLayoutShell({
  profileType,
  avatarUrl,
  activeProfile,
  initialUnread,
  initialUnreadByContact,
  children,
}: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // These routes manage their own full-screen layout; skip the sidebar/navbar
  if (
    pathname?.startsWith("/profiles") ||
    pathname?.startsWith("/onboarding") ||
    pathname?.endsWith("/profile") // students, parents: manage profile pages
  ) {
    return (
      <ActiveProfileProvider profile={activeProfile}>
        {children}
      </ActiveProfileProvider>
    );
  }

  return (
    <ActiveProfileProvider profile={activeProfile}>
      <UnreadProvider
        initialUnread={initialUnread}
        initialUnreadByContact={initialUnreadByContact}
        profileId={activeProfile?.id ?? null}
        profileType={profileType}
      >
        <PageTitleProvider>
          <div className="flex flex-row w-screen h-screen overflow-hidden">
            <FamiliesSideBar
              profileType={profileType}
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen((v) => !v)}
            />
            <div className="flex flex-1 flex-col overflow-hidden pr-0 lg:pr-6">
              <FamiliesTopBar
                profileType={profileType}
                avatarUrl={avatarUrl}
              />
              <div className="bg-[#1f2e3b] w-full flex-1 min-h-0 min-w-0 rounded-none md:rounded-2xl shadow-none md:shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)] mb-0 lg:mb-6 overflow-y-auto">
                {children}
              </div>
            </div>
          </div>
        </PageTitleProvider>
      </UnreadProvider>
    </ActiveProfileProvider>
  );
}
