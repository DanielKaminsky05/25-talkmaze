"use client";

import Avatar from "../../_components/Avatar";
import { Student } from "../../_components/StudentTable";

export default function StudentListItem({
  student,
  isSelected,
  onClick,
}: {
  student: Student;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-l-2 ${
        isSelected
          ? "bg-[#B1E7D6]/10 border-l-[#B1E7D6]"
          : "border-l-transparent hover:bg-white/5"
      }`}
    >
      <Avatar
        letter={(student.first_name ?? student.last_name ?? "?").charAt(0)}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${isSelected ? "text-[#B1E7D6]" : "text-white"}`}
        >
          {[student.first_name, student.last_name].filter(Boolean).join(" ") ||
            "Unknown"}
        </p>
        <p className="text-white/35 text-xs truncate font-mono">
          #{student.id.slice(0, 14)}
        </p>
      </div>
    </button>
  );
}
