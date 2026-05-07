"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signOut } from "@/src/lib/auth/actions/signOut";

/**
 * Component rendering the Circular profile picture and the dropdown triangle,
 * and the dropdown menu.
 * Contained in the NavigiationBar.
 */
const PROFILE_IMAGE = {
  student: "/blank_profile.png",
  parent: "/blank_profile.png",
};

type Props = {
  profileType: "student" | "parent";
  avatarUrl: string | null;
};

export default function AvatarIcon({ profileType, avatarUrl }: Props) {
  const [open, setOpen] = useState(false); // Dropdown menu visibility toggle
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Add effect to close the dropdown menu, when the user clicks anywhere on the
  // page outside of the dropdown menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center">
      {/* Avatar + arrow — single clickable area */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile menu"
        className="flex items-center gap-1.5 text-white cursor-pointer"
      >
        <div className="rounded-full w-[43px] h-[43px] md:w-[66px] md:h-[66px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] overflow-hidden relative">
          <Image
            src={avatarUrl ?? PROFILE_IMAGE[profileType]}
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

      {/* Dropdown menu */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg z-50 overflow-hidden">
          <button
            onClick={() => {
              router.push(`/${profileType}/profile`);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-3 text-gray-800 hover:bg-gray-100 text-sm font-medium"
          >
            Manage Profile
          </button>

          <button
            onClick={() => {
              router.push("/profiles");
              setOpen(false);
            }}
            className="w-full text-left px-4 py-3 text-gray-800 hover:bg-gray-100 text-sm font-medium"
          >
            Switch Profiles
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
  );
}
