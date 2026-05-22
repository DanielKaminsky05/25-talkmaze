"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/services/supabase/client";

export default function StudentPostLessonTaskSettings({ studentId }: { studentId?: string }) {
  const [enabled, setEnabled] = useState(true);
  const [days, setDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from("students")
      .select("post_lesson_tasks_enabled, post_lesson_days")
      .eq("id", studentId)
      .single()
      .then(({ data }) => {
        if (data) {
          setEnabled(data.post_lesson_tasks_enabled);
          setDays(data.post_lesson_days);
        }
        setLoading(false);
      });
  }, [studentId]);

  async function save(patch: { post_lesson_tasks_enabled?: boolean; post_lesson_days?: number }) {
    if (!studentId) return;
    const supabase = createClient();
    await supabase.from("students").update(patch).eq("id", studentId);
  }

  function toggleEnabled(value: boolean) {
    setEnabled(value);
    save({ post_lesson_tasks_enabled: value });
  }

  function changeDays(delta: number) {
    const next = Math.max(0, days + delta);
    setDays(next);
    save({ post_lesson_days: next });
  }

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
          disabled={loading}
          onClick={() => toggleEnabled(true)}
          className={`h-[39px] rounded-xl font-semibold text-[16px] text-white bg-[#1F2E3B] transition-opacity hover:opacity-80 disabled:cursor-not-allowed ${enabled ? "opacity-100" : "opacity-40"}`}
          style={{ width: "147px" }}
        >
          Yes
        </button>
        <button
          disabled={loading}
          onClick={() => toggleEnabled(false)}
          className={`h-[39px] rounded-xl font-semibold text-[16px] text-white bg-[#1F2E3B] transition-opacity hover:opacity-80 disabled:cursor-not-allowed ${!enabled ? "opacity-100" : "opacity-40"}`}
          style={{ width: "147px" }}
        >
          No
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-[22px]">
        <p className="font-semibold text-[16px] text-[#1F2E3B] min-w-0">
          How many days of post-lesson tasks?
        </p>
        <div
          className="flex items-center bg-[#1F2E3B] text-white rounded-xl overflow-hidden shrink-0"
          style={{ width: "136px", height: "39px" }}
        >
          <button
            disabled={loading}
            onClick={() => changeDays(-1)}
            className="flex items-center justify-center w-[38px] h-full hover:bg-white/10 text-xl font-bold disabled:cursor-not-allowed"
          >
            −
          </button>
          <span className="flex-1 text-center font-semibold text-[16px]">{days}</span>
          <button
            disabled={loading}
            onClick={() => changeDays(1)}
            className="flex items-center justify-center w-[38px] h-full hover:bg-white/10 text-xl font-bold disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
