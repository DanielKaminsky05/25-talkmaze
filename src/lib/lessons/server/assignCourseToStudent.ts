import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/services/supabase/types/database";

type AssignInput = {
  studentId: string;
  courseId: string;
};

type AssignResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Assigns a course to a student: inserts one lesson_progress row per lesson
 * in the course (status = 1 = "not started") plus a course_assignment row.
 *
 * Side effects are not transactional — same caveat as insertLessonIntoCourse.
 * Canonical fix is a Postgres RPC; tracked in repo-quality-audit.md.
 *
 * Shared between /api/admin/courses/assign and /api/coach/courses/assign.
 * The two routes differ only in their auth/ownership gates — admin can assign
 * to any student, coach can assign only to a student they're linked to via
 * coach_students (checked in the route, not here).
 */
export async function assignCourseToStudent(
  supabase: SupabaseClient<Database>,
  input: AssignInput,
): Promise<AssignResult> {
  const { studentId, courseId } = input;

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId);

  if (lessonsError) {
    console.error("assignCourseToStudent: fetch lessons error", lessonsError);
    return { ok: false, status: 500, error: "Internal server error" };
  }

  const progressRows = (lessons ?? []).map((lesson) => ({
    student_id: studentId,
    status: 1,
    lesson_id: lesson.id,
  }));

  if (progressRows.length > 0) {
    const { error: pushError } = await supabase
      .from("lesson_progress")
      .insert(progressRows);

    if (pushError) {
      console.error("assignCourseToStudent: push lessons error", pushError);
      return { ok: false, status: 500, error: "Internal server error" };
    }
  }

  const { error: assignError } = await supabase
    .from("course_assignment")
    .insert({
      course_id: courseId,
      student_id: studentId,
      progress: 0,
      isActive: true,
    });

  if (assignError) {
    console.error("assignCourseToStudent: insert assignment error", assignError);
    return { ok: false, status: 500, error: "Internal server error" };
  }

  return { ok: true };
}
