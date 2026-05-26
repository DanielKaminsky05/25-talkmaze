"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CoachProfileCard, { type AssignedCoach } from "./CoachProfileCard";

export type AssignedCoachEntry = {
  coach: AssignedCoach;
  forStudentName: string | null;
};

type Props = { entries: AssignedCoachEntry[] };

/**
 * Wraps the assigned-coach card with a heading row and an optional paginator.
 * The paginator appears only when there are 2+ entries; otherwise just the
 * heading and the single card render.
 */
export default function AssignedCoachSection({ entries }: Props) {
  const [index, setIndex] = useState(0);

  if (entries.length === 0) return null;

  const total = entries.length;
  const safeIndex = Math.min(index, total - 1);
  const entry = entries[safeIndex];

  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-white text-xl font-bold">
          {total > 1 ? "Assigned Coaches" : "Assigned Coach"}
        </h1>
        {total > 1 && (
          <div className="flex items-center gap-1.5 bg-[#1F2E3B] px-2 py-1 rounded-full shrink-0">
            <button
              onClick={goPrev}
              aria-label="Previous coach"
              className="w-5 h-5 rounded-full bg-[#B1E7D6] text-[#1F2E3B] flex items-center justify-center hover:opacity-90 transition-all active:scale-95 cursor-pointer"
            >
              <ChevronLeft size={12} strokeWidth={2.5} />
            </button>
            <span className="text-[11px] font-bold text-white leading-none">
              {safeIndex + 1} / {total}
            </span>
            <button
              onClick={goNext}
              aria-label="Next coach"
              className="w-5 h-5 rounded-full bg-[#B1E7D6] text-[#1F2E3B] flex items-center justify-center hover:opacity-90 transition-all active:scale-95 cursor-pointer"
            >
              <ChevronRight size={12} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      <CoachProfileCard
        coach={entry.coach}
        forStudentName={entry.forStudentName}
      />
    </div>
  );
}
