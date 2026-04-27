import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import LessonDetailClient from "./LessonDetailClient";

interface PageProps {
  params: Promise<{ studentId: string; lessonId: string }>;
}

async function resolveStorageUrl(supabase: any, path: string | null) {
  if (!path) return null;
  const cleanPath = path.replace(/^course_files\//, "");
  const { data } = supabase.storage
    .from("course_files")
    .getPublicUrl(cleanPath);
  return data?.publicUrl ?? null;
}

/**
 * CoachLessonDetailPage -
 * Server component for /coach/students/[studentId]/lessons/[lessonId]
 *
 * Fetches lesson info, student name, and progress/feedback from the DB,
 * then hands everything to LessonDetailClient for interactive editing.
 *
 * Calls notFound() (404) if either the lesson or student doesn't exist.
 */
export default async function CoachLessonDetailPage({ params }: PageProps) {
  const { studentId, lessonId } = await params;
  const supabase = await createClient();

  // Fetch lesson, student, and existing progress/feedback in parallel
  const [
    { data: lesson, error: lessonError },
    { data: student, error: studentError },
    { data: progress },
  ] = await Promise.all([
    (supabase.from("lessons") as any)
      .select(
        "id, title, description, course_id, pre_lesson_url, post_lesson_url, slide_show_url, courses!lessons_course_id_fkey(title)",
      )
      .eq("id", lessonId)
      .single(),
    (supabase.from("students") as any)
      .select("id, first_name, last_name")
      .eq("id", studentId)
      .single(),
    (supabase.from("lesson_progress") as any)
      .select("status, positive_feedback, improvement_feedback")
      .eq("student_id", studentId)
      .eq("lesson_id", lessonId)
      .maybeSingle(),
  ]);

  if (lessonError || !lesson) {
    console.error(
      "[CoachLessonDetail] lesson query failed:",
      lessonError,
      "lesson:",
      lesson,
      "lessonId:",
      lessonId,
    );
    notFound();
  }
  
  if (studentError || !student) {
    console.error(
      "[CoachLessonDetail] student query failed:",
      studentError,
      "student:",
      student,
      "studentId:",
      studentId,
    );
    notFound();
  }

  const [preLessonUrl, postLessonUrl, slideshowUrl] = await Promise.all([
    resolveStorageUrl(supabase, lesson.pre_lesson_url),
    resolveStorageUrl(supabase, lesson.post_lesson_url),
    resolveStorageUrl(supabase, lesson.slide_show_url),
  ]);

  return (
    <LessonDetailClient
      studentId={studentId}
      lessonId={lessonId}
      studentName={
        [student.first_name, student.last_name].filter(Boolean).join(" ") ||
        "Student"
      }
      lesson={{
        title: lesson.title,
        description: lesson.description,
        courseName: lesson.courses?.title ?? null,
        preLessonUrl,
        postLessonUrl,
        slideshowUrl,
      }}
      initialStatus={progress?.status ?? 1}
      initialPositiveFeedback={progress?.positive_feedback ?? ""}
      initialImprovementFeedback={progress?.improvement_feedback ?? ""}
    />
  );
}
