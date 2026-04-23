"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getActiveProfile } from "@/lib/profile-management/getActiveProfile";

type LessonSummary = {
  id: string;
  title: string;
  slug: string | null;
  order: number | null;
  slide_show_url: string | null;
};

export type HomeLesson = {
  id: string;
  title: string;
  slug: string | null;
  lessonNumber: number;
  slideShowUrl: string | null;
};

export function useHomeData() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [currentLesson, setCurrentLesson] = useState<HomeLesson | null>(null);
  const [prevLesson, setPrevLesson] = useState<HomeLesson | null>(null);
  const [nextLesson, setNextLesson] = useState<HomeLesson | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const profile = await getActiveProfile();

        if (!profile || profile.type !== "student") {
          router.push("/profiles");
          return;
        }

        const { data: assignment } = await supabase
          .from("course_assignment")
          .select("course_id")
          .eq("student_id", profile.id)
          .limit(1)
          .maybeSingle();

        if (!assignment?.course_id) {
          setLoading(false);
          return;
        }

        const [{ data: lessonsData }, { data: progressData }] =
          await Promise.all([
            supabase
              .from("lessons")
              .select("id, title, slug, order, slide_show_url")
              .eq("course_id", assignment.course_id)
              .order("order", { ascending: true }),
            supabase
              .from("lesson_progress")
              .select("lesson_id, status")
              .eq("student_id", profile.id),
          ]);

        const lessons: LessonSummary[] = lessonsData ?? [];
        const completedIds = new Set(
          (progressData ?? [])
            .filter((r: any) => r.status === 3)
            .map((r: any) => r.lesson_id as string),
        );

        const resolveSlideUrl = (raw: string | null): string | null => {
          if (!raw) return null;
          const clean = raw.replace(/^course_files\//, "");
          return supabase.storage.from("course_files").getPublicUrl(clean).data
            .publicUrl;
        };

        const toHomeLesson = (l: LessonSummary, index: number): HomeLesson => ({
          id: l.id,
          title: l.title,
          slug: l.slug,
          lessonNumber: index + 1,
          slideShowUrl: resolveSlideUrl(l.slide_show_url),
        });

        const currentIndex = lessons.findIndex((l) => !completedIds.has(l.id));

        setProgress({ completed: completedIds.size, total: lessons.length });

        if (currentIndex === -1) {
          setCurrentLesson(null);
          setPrevLesson(
            lessons.length > 0
              ? toHomeLesson(lessons[lessons.length - 1], lessons.length - 1)
              : null,
          );
          setNextLesson(null);
        } else {
          setCurrentLesson(toHomeLesson(lessons[currentIndex], currentIndex));
          setPrevLesson(
            currentIndex > 0
              ? toHomeLesson(lessons[currentIndex - 1], currentIndex - 1)
              : null,
          );
          setNextLesson(
            currentIndex < lessons.length - 1
              ? toHomeLesson(lessons[currentIndex + 1], currentIndex + 1)
              : null,
          );
        }
      } catch (err) {
        console.error("useHomeData error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { loading, progress, currentLesson, prevLesson, nextLesson };
}
