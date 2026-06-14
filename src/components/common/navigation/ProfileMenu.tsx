"use client";

import { useState, useRef, useEffect } from "react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/src/components/ui/avatar";

const FALLBACK_IMAGE = "/images/content/blank_profile.png";

export type ProfileMenuItem = {
  label: string;
  onSelect: () => void;
};

type Props = {
  avatarUrl: string | null;
  /** Dropdown actions, e.g. Manage Profile / Switch Profiles / Sign Out. */
  items: ProfileMenuItem[];
};

/**
 * Circular avatar + caret that toggles a dropdown of actions. Lives in the
 * `TopBar` of both the families and coach shells; the menu items are supplied
 * by the caller so each audience can wire its own routes/actions.
 */
export default function ProfileMenu({ avatarUrl, items }: Props) {
  const [open, setOpen] = useState(false); // Dropdown menu visibility toggle
  const ref = useRef<HTMLDivElement>(null);

  // Close the dropdown when the user clicks anywhere outside of it
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
        <Avatar
          variant="navy"
          className="size-11 md:size-16.5 shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
        >
          <AvatarImage
            src={avatarUrl ?? FALLBACK_IMAGE}
            alt="Profile"
            sizes="66px"
          />
          <AvatarFallback />
        </Avatar>
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
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-gray-800 hover:bg-gray-100 text-sm font-medium"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
