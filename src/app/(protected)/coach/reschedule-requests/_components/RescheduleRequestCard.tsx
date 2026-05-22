"use client";

import type { RescheduleRequest } from "../types";
import { formatDateTime, formatRelative } from "../formatters";

interface Props {
  request: RescheduleRequest;
  isSelected: boolean;
  onClick: () => void;
}

export default function RescheduleRequestCard({
  request,
  isSelected,
  onClick,
}: Props) {
  const studentName = request.students
    ? `${request.students.first_name ?? ""} ${
        request.students.last_name ?? ""
      }`.trim() || "Student"
    : "Student";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-colors ${
        isSelected
          ? "bg-[#B1E7D6] border-[#65CFAD]"
          : "bg-[#1F2E3B] border-white/10 hover:border-white/30"
      }`}
    >
      <p
        className={`text-sm font-semibold ${
          isSelected ? "text-[#1F2E3B]" : "text-white"
        }`}
      >
        {studentName}
      </p>
      <p
        className={`text-xs mt-1 ${
          isSelected ? "text-[#1F2E3B]/70" : "text-white/60"
        }`}
      >
        {request.requested_start_time
          ? formatDateTime(request.requested_start_time)
          : "—"}
      </p>
      <p
        className={`text-[11px] mt-1 ${
          isSelected ? "text-[#1F2E3B]/50" : "text-white/40"
        }`}
      >
        Requested{" "}
        {request.requested_at ? formatRelative(request.requested_at) : "—"}
      </p>
    </button>
  );
}
