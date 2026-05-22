"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, RotateCcw } from "lucide-react";
import { signOut } from "@/src/lib/auth/actions/signOut";

function getPageTitle(pathname: string): string {
  if (pathname.includes("/lessons/")) return "Lesson Details";
  if (pathname.startsWith("/coach/calendar")) return "Calendar";
  if (pathname.startsWith("/coach/reschedule-requests"))
    return "Reschedule Requests";
  return "Coach Dashboard";
}

export default function CoachNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const title = getPageTitle(pathname);

  return (
    <nav className="flex items-center justify-between px-6 py-3 md:px-10 md:py-4 border-b border-white/10">
      {/* Left: Logo + page title */}
      <div className="flex items-center gap-4">
        <Link href="/coach" aria-label="Coach home">
          <Image
            src="/images/logos/talkmaze-logo-mark.png"
            alt="TalkMaze"
            width={40}
            height={40}
            priority
          />
        </Link>
        <span className="hidden sm:block w-px h-6 bg-white/20" />
        <p className="hidden sm:block text-white text-lg md:text-3xl font-bold">
          {title}
        </p>
      </div>

      {/* Right: Reschedule + Calendar buttons + avatar dropdown */}
      <div className="flex items-center gap-3 md:gap-4">
        <Link
          href="/coach/reschedule-requests"
          className="inline-flex items-center gap-2 text-sm md:text-base md:font-semibold text-white bg-[#1F2E3B] border border-[#1F2E3B] rounded-[15px] px-4 py-1.5 md:px-5 md:py-2.5 shadow-[0_4px_4px_rgba(0,0,0,0.25)] hover:brightness-110 transition-all whitespace-nowrap"
        >
          <RotateCcw size={16} className="md:w-5 md:h-5" />
          <span className="hidden sm:inline">Requests</span>
        </Link>
        <Link
          href="/coach/calendar"
          className="inline-flex items-center gap-2 text-sm md:text-base md:font-semibold text-white bg-[#1F2E3B] border border-[#1F2E3B] rounded-[15px] px-4 py-1.5 md:px-5 md:py-2.5 shadow-[0_4px_4px_rgba(0,0,0,0.25)] hover:brightness-110 transition-all whitespace-nowrap"
        >
          <CalendarDays size={16} className="md:w-5 md:h-5" />
          <span className="hidden sm:inline">Calendar</span>
        </Link>

        <div ref={ref} className="relative flex items-center">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Profile menu"
            className="flex items-center gap-1.5 text-white cursor-pointer"
          >
            <div className="rounded-full w-10 h-10 md:w-12 md:h-12 shadow-[0_4px_4px_rgba(0,0,0,0.25)] overflow-hidden relative">
              <Image
                src="/images/content/blank_profile.png"
                alt="Profile"
                fill
                className="object-cover"
              />
            </div>
            <svg
              width="10"
              height="7"
              viewBox="0 0 10 7"
              fill="currentColor"
              className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            >
              <path d="M0 0L5 7L10 0H0Z" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg z-50 overflow-hidden">
              <button
                onClick={() => {
                  router.push("/coach/profile");
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-gray-800 hover:bg-gray-100 text-sm font-medium"
              >
                Profile
              </button>
              <button
                onClick={() => signOut()}
                className="w-full text-left px-4 py-3 text-gray-800 hover:bg-gray-100 text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
