"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";
import type { LessonRow, BadgeRow } from "../types";

/**
 * Fetches all data needed for the /lessons grid page.
 *
 * @returns Object containing all data needed for /lessons page to render
 */
export function useLessons() {
  const router = useRouter();
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState(new Set<string>());
  const [completedLessonIds, setCompletedLessonIds] = useState(
    new Set<string>(),
  );
  // hasCourse is false when the student exists but has no assigned course
  const [hasCourse, setHasCourse] = useState(true);

  // Load the student's lessons on page mount
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const profile = await getActiveProfile();

        // Only students can view this page
        if (!profile || profile.type !== "student") {
          router.push("/profiles");
          return;
        }

        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("id")
          .eq("id", profile.id)
          .single();

        if (!student) {
          throw new Error(
            "Cannot identify student: " + JSON.stringify(studentError),
          );
        }

        // course_assignment links a student to their enrolled course
        const { data: course } = await supabase
          .from("course_assignment")
          .select("course_id")
          .eq("student_id", student.id)
          .limit(1)
          .maybeSingle();

        // If student exists but no course, show the "no coursed assigned"
        if (!course) {
          setHasCourse(false);
          return;
        }

        const { data: lessonsData, error: lessonsError } = await supabase
          .from("lessons")
          .select("id, course_id, created_at, description, title, slug")
          .eq("course_id", course.course_id as string)
          .order("order", { ascending: true });

        if (lessonsError) console.error("Lessons fetch error:", lessonsError);

        setLessons((lessonsData as LessonRow[]) ?? []);
        setHasCourse(true);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Once lessons are loaded, fetch which ones the student has completed
  useEffect(() => {
    if (lessons.length === 0) return;

    async function loadProgress() {
      const profile = await getActiveProfile();

      if (!profile || profile.type !== "student") {
        setProgress({ completed: 0, total: lessons.length });
        return;
      }

      const supabase = createClient();
      const { data: progressRows } = await supabase
        .from("lesson_progress")
        .select("lesson_id, status")
        .eq("student_id", profile.id);

      // status === 1 means "Done"
      const completedRows = (progressRows ?? []).filter(
        (row: any) => row.status === 3,
      );

      setCompletedLessonIds(
        new Set(completedRows.map((row: any) => row.lesson_id as string)),
      );
      setProgress({ completed: completedRows.length, total: lessons.length });
    }

    loadProgress();
  }, [lessons]); // re-runs if the lessons list changes

  // Effect 3: badges are independent of the student's course, so fetch them separately
  useEffect(() => {
    async function loadBadges() {
      const supabase = createClient();
      const profile = await getActiveProfile();

      const badgesPromise = supabase
        .from("badges")
        .select("id, code, title, description, icon_url")
        .order("code", { ascending: true });

      const earnedBadgesPromise =
        profile && profile.type === "student"
          ? supabase
              .from("student_badges")
              .select("badge_id")
              .eq("student_id", profile.id)
          : Promise.resolve({ data: [], error: null });

      const [{ data: badgesData, error: badgesError }, { data: earnedData }] =
        await Promise.all([badgesPromise, earnedBadgesPromise]);

      if (!badgesError) setBadges(badgesData ?? []);
      setEarnedBadgeIds(
        new Set((earnedData ?? []).map((row: any) => row.badge_id as string)),
      );
    }

    loadBadges();
  }, []); // runs once on mount

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
    badges,
    earnedBadgeIds,
    completedLessonIds,
    hasCourse,
    navigateToLesson,
  };
}
