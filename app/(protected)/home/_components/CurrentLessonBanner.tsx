"use client";

import type { HomeLesson } from "../_hooks/useHomeData";

interface CurrentLessonBannerProps {
  lesson: HomeLesson | null;
  onClick?: () => void;
}

export default function CurrentLessonBanner({ lesson, onClick }: CurrentLessonBannerProps) {
  if (!lesson) {
    return (
      <div className="w-full h-[300px] rounded-2xl bg-[#65CFAD]/30 border-2 border-[#65CFAD]/50 flex flex-col items-center justify-center gap-3 text-white">
        <span className="text-4xl">🎉</span>
        <p className="text-2xl font-bold">Course Complete!</p>
        <p className="text-[#B1E7D6] text-sm">You have finished all lessons in this course.</p>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full h-[300px] rounded-2xl overflow-hidden relative group text-left"
      style={{
        background: "linear-gradient(135deg, #6b3fa0 0%, #2b4257 60%, #1f2e3b 100%)",
      }}
    >
      {/* Decorative pattern overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, #B1E7D6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #65CFAD 0%, transparent 40%)",
        }}
      />

      <div className="absolute inset-0 flex flex-col justify-between p-8">
        <div className="flex items-start justify-between">
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-white text-sm font-semibold">
            Explorer — Lesson {lesson.lessonNumber}
          </div>
        </div>

        <div>
          <p className="text-white/60 text-sm font-semibold uppercase tracking-widest mb-2">
            Current Lesson
          </p>
          <h2 className="text-white text-3xl font-bold leading-tight group-hover:text-[#B1E7D6] transition-colors">
            {lesson.title}
          </h2>
          <p className="text-[#B1E7D6] text-sm mt-3 font-medium">
            Click to open lesson →
          </p>
        </div>
      </div>
    </button>
  );
}
