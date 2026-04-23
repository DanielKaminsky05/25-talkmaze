"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";
import type { LessonDetailRow } from "../types";

// Columns to fetch for a lesson
const LESSON_SELECT =
  "id, course_id, title, description, content_url, pre_lesson_url, post_lesson_url, slide_show_url, slug, created_at";

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

        // Lookup lesson by slug (e.g. "intro-to-public-speaking")
        let { data: lessonData } = await supabase
          .from("lessons")
          .select(LESSON_SELECT)
          .eq("course_id", courseId)
          .eq("slug", slug)
          .maybeSingle();

        // If lesson doesn't belong to this student's course
        if (!lessonData) {
          router.push("/lessons");
          return;
        }

        setLesson(lessonData as LessonDetailRow);

        // Resolve storage URLs only for fields that have a value 
        // null means no file was uploaded
        if (lessonData.pre_lesson_url)
          setPreLessonUrl(storageUrl(supabase, lessonData.pre_lesson_url));
        if (lessonData.post_lesson_url)
          setPostLessonUrl(storageUrl(supabase, lessonData.post_lesson_url));
        if (lessonData.slide_show_url)
          setSlideShowUrl(storageUrl(supabase, lessonData.slide_show_url));

        // Fetch progress counts in parallel 
        const [{ data: allLessons }, { data: progressRows }] =
          await Promise.all([
            supabase.from("lessons").select("id, order").eq("course_id", courseId).order("order", { ascending: true, nullsFirst: false }),
            supabase
              .from("lesson_progress")
              .select("lesson_id, status")
              .eq("student_id", studentId),
          ]);

        const completed = (progressRows ?? []).filter(
          (row: any) => row.status === 3,
        ).length;

        const lessons = allLessons ?? [];
        const idx = lessons.findIndex((l) => l.id === lessonData.id);
        if (idx !== -1) setLessonNumber(idx + 1);

        setProgress({ completed, total: lessons.length });
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
  };
}
