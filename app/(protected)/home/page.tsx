"use client";

import { useRouter } from "next/navigation";
import LessonProgressBar from "../components/LessonProgressBar";
import TokenBar from "../components/TokensBar";
import ReviewLessonCard from "../components/ReviewLesson";
import NextLessonCard from "../components/UpNextLesson";
import ScheduleList from "../components/ScheduleList";
import CurrentLessonBanner from "./_components/CurrentLessonBanner";
import { useHomeData } from "./_hooks/useHomeData";

function lessonPath(lesson: { slug: string | null; id: string }) {
  return `/lessons/${lesson.slug ?? lesson.id}`;
}

export default function Home() {
  const router = useRouter();
  const { loading, progress, currentLesson, prevLesson, nextLesson } = useHomeData();

  if (loading) {
    return (
      <div className="w-full p-8 mx-auto flex items-center justify-center min-h-[300px] text-[#B1E7D6]">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full p-8 mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-8 w-full">
        <div className="flex flex-col gap-8 w-full">
          <LessonProgressBar current={progress.completed} total={progress.total} />

          <CurrentLessonBanner
            lesson={currentLesson}
            onClick={currentLesson ? () => router.push(lessonPath(currentLesson)) : undefined}
          />

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

        <div className="flex flex-col gap-8">
          <TokenBar completedCount={progress.completed} />
          <ScheduleList schedule={[]} />
        </div>
      </div>
    </div>
  );
}
