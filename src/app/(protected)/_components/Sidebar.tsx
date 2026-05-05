"use client";
import SideBarBox from "./SideBarBox";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  HomeIcon,
  LessonsIcon,
  MessageCircleIcon,
  RewardsIcon,
} from "@/src/components/ui/icons";

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
  isOpen: boolean;
  onToggle: () => void;
};

/**
 * Sidebar component, containing the navlinks for student and parent dashboards.
 *
 * On desktop (lg+) the sidebar is always visible.
 * On mobile/tablet (< lg) it renders as a fixed overlay that slides in from the
 * left.
 */
export default function SideBar({ profileType, isOpen, onToggle }: Props) {
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
    <>
      {/* ========== Mobile sidebar (< lg) ======== */}
      {/* Backdrop - clicking outside closes the sidebar */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/*
        Sliding panel + pull-tab.
        --panel-w drives both the panel width and the closed-state translateX,
        keeping them in sync across breakpoints without duplicating values.
      */}
      <div
        className="fixed inset-y-0 left-0 z-50 flex flex-row lg:hidden transition-transform duration-300 ease-in-out [--panel-w:120px] sm:[--panel-w:160px]"
        style={{
          transform: isOpen
            ? "translateX(0)"
            : "translateX(calc(-1 * var(--panel-w)))",
        }}
      >
        {/* Sidebar panel - width comes from the CSS var, so itmatches the 
        close sidebar translateX */}
        <div
          className="bg-[#2B4257] flex flex-col pt-[26px] px-2 overflow-hidden"
          style={{ width: "var(--panel-w)" }}
        >
          <Image
            src="/talkmaze.svg"
            alt="Talk Maze Logo"
            className="self-center mb-4"
            width={80}
            height={36}
          />
          <nav className="flex flex-col gap-6">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.link}
                onClick={onToggle}
                className={`flex items-center gap-2 text-sm font-semibold pl-[7px] transition-colors
                  ${activeId === item.id ? "text-[#B1E7D6]" : "text-white hover:text-[#B1E7D6]"}`}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Pull tab */}
        <button
          onClick={onToggle}
          className="self-center w-[27px] h-[188px] bg-[#2B4257] rounded-tr-[15px] rounded-br-[15px] flex items-center justify-center cursor-pointer"
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        >
          <Image
            src="/caret.png"
            alt=""
            width={18}
            height={17}
            className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* ===== Desktop sidebar (lg+) ====== */}
      {/*
        pt-[23px] matches the navbar's md:pt-[23px], so:
        23px (pt) + 68px (logo wrapper) + 13px (mb) = 104px = navbar height
        Nav items therefore always start at the same Y as the dark container top
      */}
      <div className="hidden lg:flex flex-col w-auto h-full pt-[23px] lg:px-[clamp(12px,1.5vw,24px)]">
        {/* 
          Fixed-height logo wrapper 
          logo scales inside but the 68px area never shrinks 
        */}
        <div className="h-[68px] flex items-center justify-center mb-[13px]">
          <Image
            src="/talkmaze.svg"
            alt="Talk Maze Logo"
            width={150}
            height={68}
            style={{ width: "clamp(100px, 10.5vw, 150px)", height: "auto" }}
          />
        </div>
        <nav className="flex flex-col gap-[18px]">
          {/* Sidebar items list. Renders different list for parent vs student */}
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
    </>
  );
}
