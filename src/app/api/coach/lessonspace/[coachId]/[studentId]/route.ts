import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { assertCoachAssignedToStudent } from "@/src/lib/auth/server/ownership";
import { createTeacherLinkForCoachAccount } from "@/src/lib/lessonspace/server/participants";

const ParamsSchema = z.object({
  coachId: z.string().uuid(),
  studentId: z.string().uuid(),
});

/**
 * Returns a fresh LessonSpace teacher launch link for a coach/student pair.
 *
 * Auth: coach role (2). The URL coachId must match the calling user, and the
 * coach must be assigned to the student via `coach_students`.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ coachId: string; studentId: string }> },
) {
  void _req;

  // Stage 1: AUTH
  const auth = await requireRole([2]);
  if (auth instanceof NextResponse) return auth;

  // Stage 2: VALIDATE
  const parsed = ParamsSchema.safeParse(await params);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request parameters",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const { coachId, studentId } = parsed.data;

  // Stage 3: AUTHORIZE
  // 3a. URL identity must match the caller (api-ownership.md:289).
  if (coachId !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // 3b. Coach must be assigned to this student.
  const ownership = await assertCoachAssignedToStudent(auth, studentId);
  if (ownership instanceof NextResponse) return ownership;

  // Stage 4: EXECUTE
  try {
    const teacherLink = await createTeacherLinkForCoachAccount({
      studentId,
      coachAccountId: coachId,
    });
    return NextResponse.json(teacherLink);
  } catch (err: unknown) {
    console.error("coach/lessonspace error", err);
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    if (
      message.includes("unable to find") ||
      message.includes("no lesson_space_id") ||
      message.includes("does not have a lessonspace room")
    ) {
      return NextResponse.json(
        { error: "LessonSpace room not provisioned" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
