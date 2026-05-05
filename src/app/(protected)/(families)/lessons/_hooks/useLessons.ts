"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/services/supabase/client";
import type { LessonRow, TokenRow } from "../types";
import { useActiveProfile } from "@/src/app/(protected)/(families)/_context/ActiveProfileContext";

/**
 * Fetches all data needed for the /lessons grid page.
 *
 * @returns Object containing all data needed for /lessons page to render
 */
export function useLessons() {
  const router = useRouter();
  const profile = useActiveProfile();
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [courseTokens, setCourseTokens] = useState<TokenRow[]>([]);
  const [earnedTokenIds, setEarnedTokenIds] = useState(new Set<string>());
  const [completedLessonIds, setCompletedLessonIds] = useState(
    new Set<string>(),
  );
  // hasCourse is false when the student exists but has no assigned course
  const [hasCourse, setHasCourse] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);

  // Load the student's lessons and tokens on page mount
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();

        // Only students can view this page
        if (!profile || profile.type !== "student") {
          router.push("/profiles");
          return;
        }

        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("id, is_setup_complete")
          .eq("id", profile.id)
          .single();

        if (!student) {
          throw new Error(
            "Cannot identify student: " + JSON.stringify(studentError),
          );
        }

        setIsSetupComplete(student.is_setup_complete);

        // course_assignment links a student to their enrolled course
        const { data: course } = await supabase
          .from("course_assignment")
          .select("course_id")
          .eq("student_id", student.id)
          .limit(1)
          .maybeSingle();

        // If student exists but no course, show the "no course assigned" state
        if (!course) {
          setHasCourse(false);
          return;
        }

        const [
          { data: courseHeadData },
          { data: lessonsRaw, error: lessonsError },
        ] = await Promise.all([
          supabase
            .from("courses")
            .select("head_lesson_id")
            .eq("id", course.course_id as string)
            .single(),
          supabase
            .from("lessons")
            .select(
              "id, course_id, created_at, description, title, slug, next_lesson",
            )
            .eq("course_id", course.course_id as string),
        ]);

        if (lessonsError) console.error("Lessons fetch error:", lessonsError);

        // Traverse linked list from head to get lessons in display order
        const lessonMap = new Map(
          (lessonsRaw ?? []).map((l: any) => [l.id, l]),
        );
        const orderedLessons: typeof lessonsRaw = [];
        let cur: string | null = courseHeadData?.head_lesson_id ?? null;
        while (cur) {
          const node = lessonMap.get(cur) as any;
          if (!node) break;
          orderedLessons.push(node);
          cur = node.next_lesson;
        }
        // Fallback if head is not set or list is broken
        const lessonsData =
          orderedLessons.length > 0 ? orderedLessons : (lessonsRaw ?? []);

        const lessonIds = (lessonsData ?? []).map((l: any) => l.id);

        if (lessonIds.length > 0) {
          const [{ data: courseTokensData }, { data: earnedTokensData }] =
            await Promise.all([
              supabase
                .from("tokens")
                .select("id, title, icon_url, lesson_id")
                .in("lesson_id", lessonIds),
              supabase
                .from("student_tokens")
                .select("token_id")
                .eq("student_id", student.id),
            ]);

          // Sort tokens to match the lesson order
          const orderedTokens = (lessonsData ?? [])
            .map((l: any) =>
              (courseTokensData ?? []).find((t: any) => t.lesson_id === l.id),
            )
            .filter(Boolean) as TokenRow[];

          setCourseTokens(orderedTokens);
          setEarnedTokenIds(
            new Set(
              (earnedTokensData ?? []).map((r: any) => r.token_id as string),
            ),
          );
        }

        setLessons((lessonsData as LessonRow[]) ?? []);
        setHasCourse(true);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [profile, router]);

  // Once lessons are loaded, fetch which ones the student has completed
  useEffect(() => {
    if (lessons.length === 0) return;

    async function loadProgress() {
      if (!profile || profile.type !== "student") {
        setProgress({ completed: 0, total: lessons.length });
        return;
      }

      const supabase = createClient();
      const { data: progressRows } = await supabase
        .from("lesson_progress")
        .select("lesson_id, status")
        .eq("student_id", profile.id);

      const completedRows = (progressRows ?? []).filter(
        (row: any) => row.status === 3,
      );

      setCompletedLessonIds(
        new Set(completedRows.map((row: any) => row.lesson_id as string)),
      );
      setProgress({ completed: completedRows.length, total: lessons.length });
    }

    loadProgress();
  }, [lessons, profile]); // re-runs if the lessons list changes

  // Navigate to the detail page using slug if available
  const navigateToLesson = useCallback(
    (lesson: LessonRow) => {
      router.push(`/lessons/${lesson.slug ?? lesson.id}`);
    },
    [router],
  );

  return {
    lessons,
    loading,
    error,
    progress,
    courseTokens,
    earnedTokenIds,
    completedLessonIds,
    hasCourse,
    isSetupComplete,
    navigateToLesson,
  };
}
