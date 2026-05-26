import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { assertCoachAssignedToStudent } from "@/src/lib/auth/server/ownership";

const QuerySchema = z
  .object({
    student_id: z.string().uuid().optional(),
  })
  .strict();

/**
 * Lists courses for a coach to browse when assigning one to a student.
 *
 * Auth: coach role (2). When `student_id` is present, gates with the
 * coach-student ownership check and decorates each course with the student's
 * current assignment row (or null). When absent, every `assignment` is null
 * so callers can rely on the key existing.
 */
export async function GET(req: Request) {
  // Stage 1: AUTH
  const auth = await requireRole([2]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  // Stage 2: VALIDATE
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { student_id } = parsed.data;

  // Stage 3: AUTHORIZE
  if (student_id) {
    const ownership = await assertCoachAssignedToStudent(auth, student_id);
    if (ownership instanceof NextResponse) return ownership;
  }

  // Stage 4: EXECUTE
  try {
    // course_assignment.progress is a stale denormalized column — set to 0
    // on insert and never updated by anything in the codebase. Compute the
    // real progress from lesson_progress rows instead.
    const [coursesResult, assignmentsResult, lessonsResult, progressResult] =
      await Promise.all([
        supabase.from("courses").select("id, title, description, created_at"),
        student_id
          ? supabase
              .from("course_assignment")
              .select("id, course_id, isActive, created_at")
              .eq("student_id", student_id)
          : Promise.resolve({ data: null, error: null }),
        student_id
          ? supabase.from("lessons").select("id, course_id")
          : Promise.resolve({ data: null, error: null }),
        student_id
          ? supabase
              .from("lesson_progress")
              .select("lesson_id, status")
              .eq("student_id", student_id)
          : Promise.resolve({ data: null, error: null }),
      ]);

    if (coursesResult.error) {
      console.error("coach/courses GET error", coursesResult.error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    if (assignmentsResult.error) {
      console.error(
        "coach/courses GET assignments error",
        assignmentsResult.error,
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    if (lessonsResult.error) {
      console.error("coach/courses GET lessons error", lessonsResult.error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    if (progressResult.error) {
      console.error("coach/courses GET progress error", progressResult.error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    const totalByCourse = new Map<string, number>();
    const completedLessonIds = new Set(
      (progressResult.data ?? [])
        .filter((p) => p.status === 3)
        .map((p) => p.lesson_id)
        .filter((id): id is string => !!id),
    );
    const completedByCourse = new Map<string, number>();
    for (const lesson of lessonsResult.data ?? []) {
      if (!lesson.course_id) continue;
      totalByCourse.set(
        lesson.course_id,
        (totalByCourse.get(lesson.course_id) ?? 0) + 1,
      );
      if (completedLessonIds.has(lesson.id)) {
        completedByCourse.set(
          lesson.course_id,
          (completedByCourse.get(lesson.course_id) ?? 0) + 1,
        );
      }
    }

    const assignmentsByCourseId = new Map<
      string,
      {
        id: string;
        isActive: boolean;
        assigned_at: string;
        progress: number;
      }
    >();
    for (const a of assignmentsResult.data ?? []) {
      if (!a.course_id) continue;
      const total = totalByCourse.get(a.course_id) ?? 0;
      const completed = completedByCourse.get(a.course_id) ?? 0;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      assignmentsByCourseId.set(a.course_id, {
        id: a.id,
        isActive: a.isActive ?? false,
        assigned_at: a.created_at,
        progress,
      });
    }

    const courses = (coursesResult.data ?? []).map((c) => ({
      ...c,
      assignment: assignmentsByCourseId.get(c.id) ?? null,
    }));

    return NextResponse.json({ courses });
  } catch (err) {
    console.error("coach/courses GET error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
