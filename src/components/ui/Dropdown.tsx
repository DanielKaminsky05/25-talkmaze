"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type DropdownMenuApi = { close: () => void };

interface DropdownProps {
  /** Visible label inside the trigger button. */
  label: string;
  /** Menu alignment relative to the trigger. Default "left". */
  align?: "left" | "right";
  /** Extra classes appended to the trigger button (e.g. max-width, truncation overrides). */
  triggerClassName?: string;
  /** Extra classes appended to the menu panel (e.g. min-width override). */
  menuClassName?: string;
  /** Menu contents; receives `close` so item handlers can dismiss the menu. */
  children: (api: DropdownMenuApi) => React.ReactNode;
}

/**
 * Opinionated light-themed dropdown.
 *
 * Bakes in the trigger button (label + rotating chevron), the menu panel chrome
 * (white card with border and shadow), and dismissal behaviour (click-outside,
 * Escape). Menu items are still rendered by the caller via the children
 * render-prop — pair with the exported `DropdownItem` for consistent styling.
 */
export default function Dropdown({
  label,
  align = "left",
  triggerClassName,
  menuClassName,
  children,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);

  // Outside-click and Escape dismissal — only registered while open so listeners
  // don't run for every Dropdown on the page when closed.
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className={`flex items-center gap-1.5 bg-white border border-[#1F2E3B]/20 hover:border-[#65CFAD] text-[#2B4257] text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
          triggerClassName ?? ""
        }`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          size={11}
          className={`text-[#65CFAD] transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute top-full mt-1.5 z-20 overflow-hidden bg-white border border-[#1F2E3B]/20 rounded-xl shadow-xl min-w-40 ${
            align === "right" ? "right-0" : "left-0"
          } ${menuClassName ?? ""}`}
        >
          {children({ close })}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  /** When true the item gets the selected-state styling. */
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

/**
 * Standard menu item button for use inside `<Dropdown>`. Keeps the active/hover
 * palette consistent across consumers.
 */
export function DropdownItem({ active, onClick, children }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-xs transition-colors cursor-pointer ${
        active
          ? "bg-[#B1E7D6]/40 text-[#2B4257] font-semibold"
          : "text-[#2B4257] hover:bg-[#F5F5F5]"
      }`}
    >
      {children}
    </button>
  );
}
