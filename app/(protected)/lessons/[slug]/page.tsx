"use client";

import { useParams, useRouter } from "next/navigation";
import { useLessonDetail } from "../_hooks/useLessonDetail";
import ProgressCard from "../_components/ProgressCard";
import TaskCard from "../_components/TaskCard";
import TokensCard from "../_components/TokensCard";
import SlideshowViewer from "../_components/SlideshowViewer";

export default function LessonDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const {
    lesson,
    loading,
    error,
    progress,
    preLessonUrl,
    postLessonUrl,
    slideShowUrl,
  } = useLessonDetail(slug);

  if (loading) {
    return (
      <div className="w-full max-w-[1400px] p-6 md:p-12 mx-auto text-white">
        <div className="flex items-center justify-center min-h-[200px] text-[#B1E7D6]">
          Loading lesson...
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="w-full max-w-[1400px] p-6 md:p-12 mx-auto text-white">
        <div className="rounded-2xl bg-red-500/20 text-red-200 p-6">
          {error ?? "Lesson not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] p-6 md:p-12 flex flex-col gap-8 mx-auto text-white">
      <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-right-8 duration-300">
        <button
          onClick={() => router.push("/lessons")}
          className="group flex items-center gap-2 text-xl font-bold text-white hover:text-[#B1E7D6] transition-colors self-start mb-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="currentColor"
            className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          {lesson.title}
        </button>

        <ProgressCard
          completed={progress.completed}
          total={progress.total}
          width="w-full"
        />
        <TokensCard completedCount={progress.completed} />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="bg-[#B1E7D6] rounded-3xl p-6 md:p-8 flex flex-col gap-6">
          <div className="font-semibold text-[#1f2e3b] text-lg">Task Cards</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TaskCard
              title="Pre-Lesson Work"
              instruction={
                lesson.description ??
                "Complete the pre-lesson work for this lesson."
              }
              url={preLessonUrl}
            />
            <TaskCard
              title="Post-Lesson Work"
              instruction={
                lesson.description ??
                "Complete the post-lesson work for this lesson."
              }
              url={postLessonUrl}
            />
          </div>
        </div>

        <div className="mt-8 w-full">
          <div className="bg-linear-to-r from-[#9b72cb] to-[#8659c2] rounded-t-3xl flex items-center px-12 h-[60px]">
            <span className="text-white font-semibold text-lg">Lesson Slideshow</span>
          </div>
          {slideShowUrl ? (
            <SlideshowViewer url={slideShowUrl} />
          ) : (
            <div className="w-full h-[200px] rounded-b-3xl flex items-center justify-center text-white/50 font-semibold bg-[#9b72cb]/30">
              No slideshow available for this lesson
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
