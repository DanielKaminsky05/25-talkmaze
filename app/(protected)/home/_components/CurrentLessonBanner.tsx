"use client";

import type { HomeLesson } from "../_hooks/useHomeData";
import SlideshowViewer from "../../lessons/_components/SlideshowViewer";

interface CurrentLessonBannerProps {
  lesson: HomeLesson | null;
  courseBadgeUrl?: string | null;
  onClick?: () => void;
}

export default function CurrentLessonBanner({
  lesson,
  courseBadgeUrl,
  onClick,
}: CurrentLessonBannerProps) {
  if (!lesson) {
    return (
      <div className="w-full h-full rounded-2xl bg-[#D55B40] flex items-center justify-center gap-8 px-10">
        {courseBadgeUrl && (
          <img
            src={courseBadgeUrl}
            alt="Course badge"
            className="h-28 w-28 object-contain drop-shadow-lg shrink-0"
          />
        )}
        <div className="flex flex-col gap-2">
          <p className="text-white font-extrabold text-3xl tracking-wide uppercase">
            Congratulations!
          </p>
          <p className="text-white/80 font-bold text-sm uppercase tracking-widest">
            You&apos;ve Completed The Course
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full h-full rounded-2xl overflow-hidden block cursor-pointer"
    >
      {lesson.slideShowUrl ? (
        <SlideshowViewer url={lesson.slideShowUrl} thumbnailMode />
      ) : (
        <div
          className="w-full h-full"
          style={{
            background:
              "linear-gradient(135deg, #6b3fa0 0%, #2b4257 60%, #1f2e3b 100%)",
          }}
        />
      )}
    </button>
  );
}
