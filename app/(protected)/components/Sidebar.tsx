"use client";
import SideBarBox from "./SideBarBox";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  HomeIcon,
  LessonsIcon,
  MessageCircleIcon,
  RewardsIcon,
} from "./ui/icons";

/**
 * Role-specific navigation items.
 * To add/remove a nav item for a role, edit this config. No JSX changes needed.
 *
 * Parents don't have a Rewards page, and their Lessons/Home links point to
 * parent-specific routes rather than the shared student routes.
 */
const NAV_ITEMS = {
  student: [
    { id: 0, name: "Home", link: "/home", icon: <HomeIcon /> },
    { id: 1, name: "Lessons", link: "/lessons", icon: <LessonsIcon /> },
    { id: 2, name: "Messages", link: "/message", icon: <MessageCircleIcon /> },
    { id: 3, name: "Rewards", link: "/reward", icon: <RewardsIcon /> },
  ],
  parent: [
    { id: 0, name: "Home", link: "/parent", icon: <HomeIcon /> },
    {
      id: 1,
      name: "Lessons",
      link: "/parent/lessons",
      icon: <LessonsIcon />,
    },
    {
      id: 2,
      name: "Schedule",
      link: "/parent/sessions",
      icon: <CalendarDays size={20} />,
    },
    { id: 3, name: "Messages", link: "/message", icon: <MessageCircleIcon /> },
  ],
};

type Props = {
  profileType: "student" | "parent";
};

/**
 * Sidebar component, containing the navlinks for student and parent dashboards
 */
export default function SideBar({ profileType }: Props) {
  const pathname = usePathname();
  const [activeId, setActiveId] = useState(0);

  // Pick the correct nav list for the active profile type (student or parent)
  const items = NAV_ITEMS[profileType];

  // Highlight the nav item whose link matches the current URL
  useEffect(() => {
    const match = [...items]
      // .sort() so that the longer URL gets matched first before shorter one
      // This matters for nested routes /parent/lessons should match over /parents
      .sort((a, b) => b.link.length - a.link.length)
      .find((item) => pathname.startsWith(item.link));
    setActiveId(match ? match.id : 0);
  }, [pathname, items]);

  return (
    <div className="flex flex-col w-auto h-full px-6 pt-[26px]">
      {/* Logo */}
      <Image
        src="/talkmaze.svg"
        alt="Talk Maze Logo"
        className="self-center mb-[13px]"
        width={150}
        height={68}
      />
      <nav className="flex flex-col gap-[18px]">
        {/* Navigation items list. Renders different list for parent vs student */}
        {items.map((item) => (
          <SideBarBox
            key={item.id}
            id={item.id}
            name={item.name}
            state={activeId === item.id}
            link={item.link}
            icon={item.icon}
            onSelect={() => setActiveId(item.id)}
          />
        ))}
      </nav>
    </div>
  );
}

