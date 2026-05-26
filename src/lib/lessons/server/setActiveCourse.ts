import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/services/supabase/types/database";

type SetActiveResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Sets a student's `active_course_id` to `courseId`, only if the student has
 * an active course_assignment row for that course. Used by the family-side
 * course picker.
 *
 * Pass `courseId: null` to clear the selection (e.g. when the last active
 * assignment is removed). When clearing, no assignment check is performed.
 */
export async function setActiveCourse(
  supabase: SupabaseClient<Database>,
  studentId: string,
  courseId: string | null,
): Promise<SetActiveResult> {
  if (courseId !== null) {
    const { data: assignment, error: lookupError } = await supabase
      .from("course_assignment")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .eq("isActive", true)
      .maybeSingle();
    if (lookupError) {
      console.error("setActiveCourse: lookup error", lookupError);
      return { ok: false, status: 500, error: "Internal server error" };
    }
    if (!assignment) {
      return {
        ok: false,
        status: 400,
        error: "Course is not actively assigned to this student",
      };
    }
  }

  const { error: updateError } = await supabase
    .from("students")
    .update({ active_course_id: courseId })
    .eq("id", studentId);
  if (updateError) {
    console.error("setActiveCourse: update error", updateError);
    return { ok: false, status: 500, error: "Internal server error" };
  }
  return { ok: true };
}

/**
 * After a course is unassigned, decide what `active_course_id` should become:
 *  - If the unassigned course was NOT the active one → leave active alone.
 *  - If it WAS the active one → fall back to the most recently created
 *    remaining active assignment, or null if there are none.
 *
 * Called from the DELETE/unassign path so the family-side picker never
 * dangles on a soft-deleted course.
 */
export async function reconcileActiveCourseAfterUnassign(
  supabase: SupabaseClient<Database>,
  studentId: string,
  unassignedCourseId: string,
): Promise<void> {
  const { data: student } = await supabase
    .from("students")
    .select("active_course_id")
    .eq("id", studentId)
    .maybeSingle();
  if (student?.active_course_id !== unassignedCourseId) return;

  const { data: fallback } = await supabase
    .from("course_assignment")
    .select("course_id, created_at")
    .eq("student_id", studentId)
    .eq("isActive", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("students")
    .update({ active_course_id: fallback?.course_id ?? null })
    .eq("id", studentId);
}
