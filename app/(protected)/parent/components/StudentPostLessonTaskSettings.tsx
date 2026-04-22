"use client";

import { useState } from "react";

/**
 * Displays the post-lesson task settings for the selected student.
 */
export default function StudentPostLessonTaskSettings({ studentId: _ }: { studentId?: string }) {
  const [, setEnabled] = useState(true);
  const [days, setDays] = useState(0);

  return (
    <div
      className="bg-[#B1E7D6] rounded-2xl shadow-[0_4px_4px_rgba(0,0,0,0.25)] flex flex-col justify-between px-8 py-[30px]"
      style={{ height: "100%", fontFamily: "Roboto, sans-serif" }}
    >
      <p className="font-semibold text-[16px] text-[#1F2E3B] max-w-full">
        Do you want your child to have post-lesson tasks?
      </p>

      <div className="flex gap-6">
        <button
          onClick={() => setEnabled(true)}
          className="h-[39px] rounded-xl font-semibold text-[16px] text-white bg-[#1F2E3B] transition-opacity hover:opacity-80"
          style={{ width: "147px" }}
        >
          Yes
        </button>
        <button
          onClick={() => setEnabled(false)}
          className="h-[39px] rounded-xl font-semibold text-[16px] text-white bg-[#1F2E3B] transition-opacity hover:opacity-80"
          style={{ width: "147px" }}
        >
          No
        </button>
      </div>

      <div className="flex items-center gap-[22px]">
        <p className="font-semibold text-[16px] text-[#1F2E3B] whitespace-nowrap">
          How many days of post-lesson tasks?
        </p>
        <div
          className="flex items-center bg-[#1F2E3B] text-white rounded-xl overflow-hidden shrink-0"
          style={{ width: "136px", height: "39px" }}
        >
          <button
            onClick={() => setDays(Math.max(0, days - 1))}
            className="flex items-center justify-center w-[38px] h-full hover:bg-white/10 text-xl font-bold"
          >
            −
          </button>
          <span className="flex-1 text-center font-semibold text-[16px]">{days}</span>
          <button
            onClick={() => setDays(days + 1)}
            className="flex items-center justify-center w-[38px] h-full hover:bg-white/10 text-xl font-bold"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
