"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useLessonDetail } from "../_hooks/useLessonDetail";
import { usePageTitle } from "../../_context/PageTitleContext";
import ProgressCard from "../_components/ProgressCard";
import TaskCard from "../_components/TaskCard";
import TokensCard from "../_components/TokensCard";
import SlideshowViewer from "../_components/SlideshowViewer";
import PageSpinner from "../../components/PageSpinner";

export default function LessonDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { setTitle } = usePageTitle();
  const {
    lesson,
    loading,
    error,
    progress,
    lessonNumber,
    preLessonUrl,
    postLessonUrl,
    slideShowUrl,
    courseTokens,
    earnedTokenIds,
  } = useLessonDetail(slug);

  useEffect(() => {
    if (lesson?.title && lessonNumber != null)
      setTitle(`Lesson ${lessonNumber}: ${lesson.title}`);
    return () => setTitle(null);
  }, [lesson?.title, lessonNumber, setTitle]);

  if (loading) {
    return <PageSpinner />;
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
        <ProgressCard
          completed={progress.completed}
          total={progress.total}
          width="w-full"
        />
        <TokensCard
          courseTokens={courseTokens}
          earnedTokenIds={earnedTokenIds}
        />
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
            <span className="text-white font-semibold text-lg">
              Lesson Slideshow
            </span>
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
