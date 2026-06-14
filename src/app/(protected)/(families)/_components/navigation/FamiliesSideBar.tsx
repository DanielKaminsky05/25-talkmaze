"use client";
import { CalendarDays } from "lucide-react";
import SideBar from "@/src/components/common/navigation/SideBar";
import type { NavItem } from "@/src/components/common/navigation/types";
import {
  HomeIcon,
  LessonsIcon,
  MessageCircleIcon,
  RewardsIcon,
} from "@/src/components/ui/icons";
import { useUnreadMessages } from "@/src/components/common/messaging/UnreadMessagesContext";

/**
 * Role-specific navigation items.
 * To add/remove a nav item for a role, edit this config. No JSX changes needed
 */
const NAV_ITEMS: Record<"student" | "parent", NavItem[]> = {
  student: [
    { id: 0, name: "Home", link: "/student", icon: <HomeIcon /> },
    {
      id: 1,
      name: "Lessons",
      link: "/student/lessons",
      icon: <LessonsIcon />,
    },
    { id: 2, name: "Messages", link: "/message", icon: <MessageCircleIcon /> },
    { id: 3, name: "Rewards", link: "/student/reward", icon: <RewardsIcon /> },
  ],
  parent: [
    { id: 0, name: "Home", link: "/parent", icon: <HomeIcon /> },
    { id: 1, name: "Lessons", link: "/parent/lessons", icon: <LessonsIcon /> },
    {
      id: 2,
      name: "Schedule",
      link: "/parent/schedule",
      icon: <CalendarDays size={20} />,
    },
    { id: 3, name: "Messages", link: "/message", icon: <MessageCircleIcon /> },
  ],
};

type Props = {
  profileType: "student" | "parent";
  isOpen: boolean;
  onToggle: () => void;
};

/**
 * Families adapter for the shared `SideBar`: picks the role's nav config and
 * injects the live unread-message badge onto the Messages item.
 */
export default function FamiliesSideBar({
  profileType,
  isOpen,
  onToggle,
}: Props) {
  const { unreadCount } = useUnreadMessages();

  const navItems = NAV_ITEMS[profileType].map((item) =>
    item.link === "/message" ? { ...item, badge: unreadCount } : item,
  );
  const homeLink = profileType === "parent" ? "/parent" : "/student";

  return (
    <SideBar
      navItems={navItems}
      homeLink={homeLink}
      isOpen={isOpen}
      onToggle={onToggle}
    />
  );
}
