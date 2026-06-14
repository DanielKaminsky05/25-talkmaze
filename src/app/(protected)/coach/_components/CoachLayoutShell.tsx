"use client";

import { ReactNode, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, RotateCcw, Users } from "lucide-react";
import SideBar from "@/src/components/common/navigation/SideBar";
import TopBar from "@/src/components/common/navigation/TopBar";
import ProfileMenu, {
  type ProfileMenuItem,
} from "@/src/components/common/navigation/ProfileMenu";
import type { NavItem } from "@/src/components/common/navigation/types";
import { HomeIcon, MessageCircleIcon } from "@/src/components/ui/icons";
import { signOut } from "@/src/lib/auth/actions/signOut";
import { usePendingReschedules } from "../_context/RescheduleContext";
import { useUnreadMessages } from "@/src/components/common/messaging/UnreadMessagesContext";

type Props = {
  avatarUrl: string | null;
  children: ReactNode;
};

/** Coach page title, keyed off the current pathname (first match wins). */
function getCoachPageTitle(pathname: string): string {
  if (pathname.includes("/lessons/")) return "Lesson Details";
  if (pathname.startsWith("/coach/calendar")) return "Calendar";
  if (pathname.startsWith("/coach/reschedule-requests"))
    return "Reschedule Requests";
  if (pathname.startsWith("/coach/message")) return "Messages";
  return "Coach Dashboard";
}

/**
 * Coach dashboard shell: composes the shared sidebar + top bar chrome (the same
 * components the families shell uses) with coach-specific nav config and the
 * profile menu. The Requests badge reads the live pending count from
 * `RescheduleProvider` (wrapped in the coach layout).
 */
export default function CoachLayoutShell({ avatarUrl, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { pendingCount } = usePendingReschedules();
  const { unreadCount } = useUnreadMessages();

  const navItems: NavItem[] = [
    // { id: 0, name: "Home", link: "/coach", icon: <HomeIcon /> },
    {
      id: 1,
      name: "Students",
      link: "/coach/students",
      icon: <Users size={20} />,
    },
    {
      id: 2,
      name: "Schedule",
      link: "/coach/calendar",
      icon: <CalendarDays size={20} />,
    },
    {
      id: 3,
      name: "Messages",
      link: "/coach/message",
      icon: <MessageCircleIcon />,
      badge: unreadCount,
      badgeVariant: "primary",
    },
    {
      id: 4,
      name: "Requests",
      link: "/coach/reschedule-requests",
      icon: <RotateCcw size={20} />,
      badge: pendingCount,
      badgeVariant: "warning",
    },
  ];

  const menuItems: ProfileMenuItem[] = [
    { label: "Profile", onSelect: () => router.push("/coach/profile") },
    { label: "Sign Out", onSelect: () => signOut() },
  ];

  return (
    <div className="flex flex-row w-screen h-screen overflow-hidden">
      <SideBar
        navItems={navItems}
        homeLink="/coach"
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />
      <div className="flex flex-1 flex-col overflow-hidden pr-0 lg:pr-6">
        <TopBar
          title={getCoachPageTitle(pathname)}
          rightSlot={<ProfileMenu avatarUrl={avatarUrl} items={menuItems} />}
        />
        <div className="bg-[#1f2e3b] w-full flex-1 min-h-0 min-w-0 rounded-none md:rounded-2xl shadow-none md:shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)] mb-0 lg:mb-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
