"use client";

import { useRouter } from "next/navigation";
import PageSpinner from "@/src/components/ui/PageSpinner";
import LessonProgressBar from "@/src/app/(protected)/(families)/_components/LessonProgressBar";
import TokenBar from "@/src/app/(protected)/(families)/_components/TokensBar";
import ReviewLessonCard from "./_components/ReviewLesson";
import NextLessonCard from "./_components/UpNextLesson";
import ScheduleList from "../_components/upcoming-schedule/ScheduleList";
import CurrentLessonBanner from "./_components/CurrentLessonBanner";
import { useHomeData } from "./_hooks/useHomeData";

function lessonPath(lesson: { slug: string | null; id: string }) {
  return `/lessons/${lesson.slug ?? lesson.id}`;
}

export default function Home() {
  const router = useRouter();
  const {
    loading,
    isSetupComplete,
    progress,
    currentLesson,
    prevLesson,
    nextLesson,
    sessions,
    courseTokens,
    earnedTokenIds,
    courseBadgeUrl,
  } = useHomeData();

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="w-full p-8 2xl:px-24 mx-auto h-full">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-8 w-full xl:h-full">
        <div className="flex flex-col gap-6 w-full xl:h-full min-h-0">
          <LessonProgressBar
            current={progress.completed}
            total={progress.total}
          />

          <div className="w-full aspect-16/7">
            <CurrentLessonBanner
              lesson={currentLesson}
              courseBadgeUrl={courseBadgeUrl}
              isSetupComplete={isSetupComplete}
              onClick={
                currentLesson
                  ? () => router.push(lessonPath(currentLesson))
                  : undefined
              }
            />
          </div>

          <div className="grid w-full gap-6 sm:gap-8 grid-cols-1 lg:grid-cols-2">
            {prevLesson && (
              <ReviewLessonCard
                lessonNumber={prevLesson.lessonNumber}
                title={prevLesson.title}
                onClick={() => router.push(lessonPath(prevLesson))}
              />
            )}
            {nextLesson && (
              <NextLessonCard
                lessonNumber={nextLesson.lessonNumber}
                title={nextLesson.title}
                onClick={() => router.push(lessonPath(nextLesson))}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 xl:h-full xl:min-h-0">
          <TokenBar
            courseTokens={courseTokens}
            earnedTokenIds={earnedTokenIds}
          />
          <div className="flex-1 min-h-0">
            <ScheduleList schedule={sessions} />
          </div>
        </div>
      </div>
    </div>
  );
}
