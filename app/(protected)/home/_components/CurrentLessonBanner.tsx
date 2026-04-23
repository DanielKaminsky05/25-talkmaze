"use client";

import type { HomeLesson } from "../_hooks/useHomeData";
import SlideshowViewer from "../../lessons/_components/SlideshowViewer";

interface CurrentLessonBannerProps {
  lesson: HomeLesson | null;
  onClick?: () => void;
}

export default function CurrentLessonBanner({
  lesson,
  onClick,
}: CurrentLessonBannerProps) {
  if (!lesson) {
    return (
      <div className="w-full h-[300px] rounded-2xl bg-[#65CFAD]/30 border-2 border-[#65CFAD]/50 flex flex-col items-center justify-center gap-3 text-white">
        <span className="text-4xl">🎉</span>
        <p className="text-2xl font-bold">Course Complete!</p>
        <p className="text-[#B1E7D6] text-sm">
          You have finished all lessons in this course.
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl overflow-hidden block cursor-pointer"
    >
      {lesson.slideShowUrl ? (
        <SlideshowViewer url={lesson.slideShowUrl} thumbnailMode />
      ) : (
        <div
          className="w-full h-[300px]"
          style={{
            background:
              "linear-gradient(135deg, #6b3fa0 0%, #2b4257 60%, #1f2e3b 100%)",
          }}
        />
      )}
    </button>
  );
}
