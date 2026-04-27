"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/services/supabase/client";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";
import type { LessonDetailRow, TokenRow } from "../types";

// Columns to fetch for a lesson
const LESSON_SELECT =
  "id, course_id, title, description, content_url, pre_lesson_url, post_lesson_url, slide_show_url, slug, created_at, pre_lesson_description, post_lesson_description";

/**
 * Strips the redundant "course_files/" bucket prefix from stored paths
 * @returns a public url to the course file
 */
function storageUrl(
  supabase: ReturnType<typeof createClient>,
  path: string,
): string {
  const clean = path.replace(/^course_files\//, "");
  return supabase.storage.from("course_files").getPublicUrl(clean).data
    .publicUrl;
}

/**
 * Fetches all data needed for the /lessons/[slug] detail page.
 */
export function useLessonDetail(slug: string) {
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonDetailRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [lessonNumber, setLessonNumber] = useState<number | null>(null);
  const [preLessonUrl, setPreLessonUrl] = useState<string | null>(null);
  const [postLessonUrl, setPostLessonUrl] = useState<string | null>(null);
  const [slideShowUrl, setSlideShowUrl] = useState<string | null>(null);
  const [courseTokens, setCourseTokens] = useState<TokenRow[]>([]);
  const [earnedTokenIds, setEarnedTokenIds] = useState(new Set<string>());
  const [isLocked, setIsLocked] = useState(false);
  const [positiveFeedback, setPositiveFeedback] = useState<string | null>(null);
  const [improvementFeedback, setImprovementFeedback] = useState<string | null>(
    null,
  );
  const [preLessonDesc, setPreLessonDesc] = useState<string | null>(null);
  const [postLessonDesc, setPostLessonDesc] = useState<string | null>(null);

  // Re-runs every time the [slug] changes
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const profile = await getActiveProfile();

        // Only students can view lesson detail pages
        if (!profile || profile.type !== "student") {
          router.push("/profiles");
          return;
        }

        const studentId = profile.id;

        // Fetch the student's course assignment to scope the lesson lookup
        const { data: course } = await supabase
          .from("course_assignment")
          .select("course_id")
          .eq("student_id", studentId)
          .limit(1)
          .maybeSingle();

        // If no course assigned send back to the lessons list
        if (!course) {
          router.push("/lessons");
          return;
        }

        const courseId = course.course_id!;

        // Lookup lesson by slug, fall back to id for lessons without a slug
        let { data: lessonData } = await supabase
          .from("lessons")
          .select(LESSON_SELECT)
          .eq("course_id", courseId)
          .eq("slug", slug)
          .maybeSingle();

        if (!lessonData) {
          const { data: byId } = await supabase
            .from("lessons")
            .select(LESSON_SELECT)
            .eq("course_id", courseId)
            .eq("id", slug)
            .maybeSingle();
          lessonData = byId;
        }

        if (!lessonData) {
          router.push("/lessons");
          return;
        }

        setLesson(lessonData as LessonDetailRow);
        setPreLessonDesc(lessonData.pre_lesson_description ?? null);
        setPostLessonDesc(lessonData.post_lesson_description ?? null);

        // Resolve storage URLs only for fields that have a value
        // null means no file was uploaded
        if (lessonData.pre_lesson_url)
          setPreLessonUrl(storageUrl(supabase, lessonData.pre_lesson_url));
        if (lessonData.post_lesson_url)
          setPostLessonUrl(storageUrl(supabase, lessonData.post_lesson_url));
        if (lessonData.slide_show_url)
          setSlideShowUrl(storageUrl(supabase, lessonData.slide_show_url));

        // Fetch progress, all lessons (for ordering), and earned tokens in parallel
        const [
          { data: courseHeadData },
          { data: allLessonsRaw },
          { data: progressRows },
          { data: earnedTokensData },
        ] = await Promise.all([
          supabase
            .from("courses")
            .select("head_lesson_id")
            .eq("id", courseId)
            .single(),
          supabase
            .from("lessons")
            .select("id, next_lesson")
            .eq("course_id", courseId),
          supabase
            .from("lesson_progress")
            .select(
              "lesson_id, status, positive_feedback, improvement_feedback",
            )
            .eq("student_id", studentId),
          supabase
            .from("student_tokens")
            .select("token_id")
            .eq("student_id", studentId),
        ]);

        // Traverse linked list from head to get lessons in display order
        const lessonMap = new Map(
          (allLessonsRaw ?? []).map((l: any) => [l.id, l]),
        );
        const lessons: { id: string }[] = [];
        let cur: string | null = courseHeadData?.head_lesson_id ?? null;
        while (cur) {
          const node = lessonMap.get(cur) as any;
          if (!node) break;
          lessons.push({ id: node.id });
          cur = node.next_lesson;
        }
        // Fallback if head is not set or list is broken
        if (lessons.length === 0 && (allLessonsRaw?.length ?? 0) > 0) {
          lessons.push(
            ...(allLessonsRaw ?? []).map((l: any) => ({ id: l.id })),
          );
        }

        const thisLessonProgress = (progressRows ?? []).find(
          (row: any) => row.lesson_id === lessonData.id,
        ) as any;
        setPositiveFeedback(thisLessonProgress?.positive_feedback ?? null);
        setImprovementFeedback(
          thisLessonProgress?.improvement_feedback ?? null,
        );

        const completedIds = new Set(
          (progressRows ?? [])
            .filter((row: any) => row.status === 3)
            .map((row: any) => row.lesson_id as string),
        );
        const completed = completedIds.size;

        const idx = lessons.findIndex((l) => l.id === lessonData.id);
        if (idx !== -1) setLessonNumber(idx + 1);

        setProgress({ completed, total: lessons.length });

        const firstIncompleteIdx = lessons.findIndex(
          (l) => !completedIds.has(l.id),
        );
        setIsLocked(
          firstIncompleteIdx !== -1 && idx !== -1 && idx > firstIncompleteIdx,
        );

        setEarnedTokenIds(
          new Set(
            (earnedTokensData ?? []).map((r: any) => r.token_id as string),
          ),
        );

        // Fetch course tokens using the lesson IDs we now have
        const lessonIds = lessons.map((l) => l.id);
        if (lessonIds.length > 0) {
          const { data: tokensData } = await supabase
            .from("tokens")
            .select("id, title, icon_url, lesson_id")
            .in("lesson_id", lessonIds);

          const orderedTokens = lessons
            .map((l) =>
              (tokensData ?? []).find((t: any) => t.lesson_id === l.id),
            )
            .filter(Boolean) as TokenRow[];

          setCourseTokens(orderedTokens);
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  return {
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
    isLocked,
    positiveFeedback,
    improvementFeedback,
    preLessonDesc,
    postLessonDesc,
  };
}
