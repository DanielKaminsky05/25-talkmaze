"use client";

import { memo } from "react";

type Props = {
  lessonNumber: number; // 1-based index shown on the card label
  title: string; // lesson title shown in the footer strip
  icon: string; // emoji assigned to this lesson (cycles through LESSON_ICONS)
  onClick: () => void; // navigates to /lessons/[slug]
  isCompleted?: boolean; // whether the student has completed this lesson
};

/**
 * Clickable card in the lessons grid representing one lesson
 */
const LessonCard = memo(function LessonCard({
  lessonNumber,
  title,
  icon,
  onClick,
  isCompleted,
}: Props) {
  return (
    <div
      onClick={onClick}
      className="relative w-full h-60 rounded-xl bg-[#C5F0E1] p-4
                 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group"
    >
      {/* Lesson number label & completion checkbox */}
      <div className="absolute top-4 left-5 flex items-center gap-2">
        <div className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
          Lesson {lessonNumber}
        </div>

        {/* Filled checkmark if completed, empty box if not */}
        <div className="w-6 h-6 bg-white rounded-lg shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
          {isCompleted ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2B4257"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <div className="w-3.5 h-3.5 border-2 border-[#2B4257] rounded-sm" />
          )}
        </div>
      </div>

      {/* Reward token for the lesson */}
      <div className="absolute top-4 right-5 w-14 h-14 rounded-xl bg-white text-3xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
        {icon}
      </div>

      {/* Lesson title */}
      <div className="absolute bottom-0 left-0 w-full h-[85px] bg-[#66d0ae] rounded-b-xl flex items-center justify-center px-4">
        <span className="text-white font-bold text-center leading-tight">
          {title}
        </span>
      </div>
    </div>
  );
});

export default LessonCard;
