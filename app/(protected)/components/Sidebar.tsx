"use client";
import SideBarBox from "./SideBarBox";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  BookOpen,
  MessageCircle,
  Award,
  CalendarDays,
} from "lucide-react";

/**
 * Role-specific navigation items.
 * To add/remove a nav item for a role, edit this config. No JSX changes needed.
 *
 * Parents don't have a Rewards page, and their Lessons/Home links point to
 * parent-specific routes rather than the shared student routes.
 */
const NAV_ITEMS = {
  student: [
    { id: 0, name: "Home", link: "/home", icon: <Home size={20} /> },
    { id: 1, name: "Lessons", link: "/lesson", icon: <BookOpen size={20} /> },
    {
      id: 2,
      name: "Messages",
      link: "/message",
      icon: <MessageCircle size={20} />,
    },
    { id: 3, name: "Rewards", link: "/reward", icon: <Award size={20} /> },
  ],
  parent: [
    { id: 0, name: "Home", link: "/parent", icon: <Home size={20} /> }, // parent dashboard home is /parent
    {
      id: 1,
      name: "Lessons",
      link: "/parent/lessons", // different than /lessons page in student dash.
      icon: <BookOpen size={20} />,
    }, 
    {
      id: 2,
      name: "Schedule",
      link: "/session",
      icon: <CalendarDays size={20} />,
    },
    {
      id: 3,
      name: "Messages",
      link: "/message",
      icon: <MessageCircle size={20} />,
    },
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
    <div className="flex flex-col gap-8 w-auto h-full px-6 pt-6 ">
      {/* Logo */}
      <Image src="/logo.png" alt="Talk Maze Logo" width={204} height={68} />
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
    </div>
  );
}
