"use client";

import Avatar from "../../_components/Avatar";
import type { Coach } from "../../_types";

export default function CoachListItem({
  coach,
  isSelected,
  onClick,
}: {
  coach: Coach;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-l-2 ${
        isSelected ? "bg-[#65CFAD]/10 border-l-[#65CFAD]" : "border-l-transparent hover:bg-white/5"
      }`}
    >
      <Avatar letter={coach.first_name.charAt(0) || "?"} color="text-[#65CFAD]" bg="bg-[#65CFAD]/15" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? "text-[#65CFAD]" : "text-white"}`}>
          {coach.first_name} {coach.last_name}
        </p>
        <p className="text-white/35 text-xs truncate font-mono">#{coach.id.slice(0, 14)}</p>
      </div>
    </button>
  );
}
