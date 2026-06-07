"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLessonDetail } from "../_hooks/useLessonDetail";
import { usePageTitle } from "../../_context/PageTitleContext";
import ProgressCard from "../_components/ProgressCard";
import TaskCard from "../_components/TaskCard";
import TokensCard from "../_components/TokensCard";
import SlideshowViewer from "../_components/SlideshowViewer";
import PageSpinner from "@/src/components/ui/PageSpinner";
import RichTextDisplay from "@/src/components/common/rich-text/RichTextDisplay";
import { Button } from "@/src/components/ui/button";

export default function LessonDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
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
    slidePptxUrl,
    courseTokens,
    earnedTokenIds,
    isLocked,
    positiveFeedback,
    improvementFeedback,
    preLessonDesc,
    postLessonDesc,
    postLessonTasksEnabled,
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

  if (isLocked) {
    return (
      <div className="w-full max-w-[1400px] p-6 md:p-12 mx-auto flex items-center justify-center">
        <div className="bg-[#2B4257]/40 backdrop-blur-md rounded-3xl p-12 flex flex-col items-center text-center gap-6 border border-[#B1E7D6]/20 shadow-2xl max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-[#B1E7D6]/20 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#B1E7D6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Lesson Locked</h2>
          <p className="text-[#B1E7D6]/80">
            Complete your current lesson before unlocking this one.
          </p>
          <Button
            variant="accent"
            rounded="xl"
            onClick={() => router.push("/lessons")}
            className="mt-2"
          >
            Back to Lessons
          </Button>
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
              url={preLessonUrl}
              richDescription={preLessonDesc}
            />
            <TaskCard
              title="Post-Lesson Work"
              optional={!postLessonTasksEnabled}
              url={postLessonUrl}
              richDescription={postLessonDesc}
            />
          </div>
        </div>

        <div className="mt-8 w-full">
          <div className="bg-linear-to-r from-[#9b72cb] to-[#8659c2] rounded-t-3xl flex items-center justify-between px-12 h-[60px]">
            <span className="text-white font-semibold text-lg">
              Lesson Slideshow
            </span>
            {(slidePptxUrl || slideShowUrl) && (
              <a
                href={`${slidePptxUrl ?? slideShowUrl}?download=`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 1v9M8 10l-3-3M8 10l3-3M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {slidePptxUrl ? "Download PPTX" : "Download PDF"}
              </a>
            )}
          </div>
          {slideShowUrl ? (
            <SlideshowViewer url={slideShowUrl} />
          ) : (
            <div className="w-full h-[200px] rounded-b-3xl flex items-center justify-center text-white/50 font-semibold bg-[#9b72cb]/30">
              No slideshow available for this lesson
            </div>
          )}
        </div>

        {/* Coach Feedback */}
        {(positiveFeedback || improvementFeedback) && (
          <div className="mt-8 flex flex-col gap-4">
            <RichTextDisplay
              title="Positive Feedback"
              content={positiveFeedback}
            />
            <RichTextDisplay
              title="Areas of Improvement"
              content={improvementFeedback}
            />
          </div>
        )}
      </div>
    </div>
  );
}
