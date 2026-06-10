"use client";

import type { HomeLesson } from "../_hooks/useHomeData";
import SlideshowViewer from "../lessons/_components/SlideshowViewer";

interface CurrentLessonBannerProps {
  lesson: HomeLesson | null;
  courseBadgeUrl?: string | null;
  isSetupComplete?: boolean | null;
  hasCourse?: boolean;
  onClick?: () => void;
}

export default function CurrentLessonBanner({
  lesson,
  courseBadgeUrl,
  isSetupComplete,
  hasCourse,
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

    if (!hasCourse) {
      return (
        <div className="w-full h-full rounded-2xl bg-[#7564C0] flex items-center justify-center gap-8 px-10">
          <div className="flex flex-col gap-2 text-center">
            <p className="text-white font-extrabold text-3xl tracking-wide">
              No Course Assigned
            </p>
            <p className="text-white/80 font-medium text-sm max-w-sm">
              Your coach hasn&apos;t assigned a course yet. Check back soon — it
              will appear here once it&apos;s ready.
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
          className="w-full h-full flex items-center justify-center px-6"
          style={{
            background:
              "linear-gradient(135deg, #6b3fa0 0%, #2b4257 60%, #1f2e3b 100%)",
          }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-[#B1E7D6]/80 text-xs sm:text-sm font-semibold uppercase tracking-widest">
              Continue lesson {lesson.lessonNumber}
            </p>
            <p className="text-white text-lg sm:text-2xl xl:text-3xl font-extrabold line-clamp-2">
              {lesson.title}
            </p>
          </div>
        </div>
      )}
    </button>
  );
}
