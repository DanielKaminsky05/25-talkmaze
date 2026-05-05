"use client";

import type { HomeLesson } from "../_hooks/useHomeData";
import SlideshowViewer from "../../lessons/_components/SlideshowViewer";

interface CurrentLessonBannerProps {
  lesson: HomeLesson | null;
  courseBadgeUrl?: string | null;
  isSetupComplete?: boolean | null;
  onClick?: () => void;
}

export default function CurrentLessonBanner({
  lesson,
  courseBadgeUrl,
  isSetupComplete,
  onClick,
}: CurrentLessonBannerProps) {
  if (!lesson) {
    if (isSetupComplete === false) {
      return (
        <div className="w-full h-full rounded-2xl bg-[#2B4257] flex items-center justify-center gap-8 px-10 border border-[#B1E7D6]/20">
          <div className="flex flex-col gap-2 text-center">
            <p className="text-white font-extrabold text-3xl tracking-wide">
              Setup Required
            </p>
            <p className="text-[#B1E7D6]/80 font-medium text-sm max-w-sm">
              Ask your parent to enter the parent dashboard and complete your
              profile setup so we can match you with a coach.
            </p>
          </div>
        </div>
      );
    }

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
