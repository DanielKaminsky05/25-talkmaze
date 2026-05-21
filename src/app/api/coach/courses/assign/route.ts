import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { assertCoachAssignedToStudent } from "@/src/lib/auth/server/ownership";
import { assignCourseToStudent } from "@/src/lib/lessons/server/assignCourseToStudent";

const BodySchema = z
  .object({
    studentId: z.string().uuid(),
    courseId: z.string().uuid(),
  })
  .strict();

/**
 * Assigns a course to a student that the calling coach is linked to.
 *
 * Auth: coach role (2) + coach_students ownership of the student.
 * Mirrors POST /api/admin/courses/assign; both delegate to
 * src/lib/lessons/server/assignCourseToStudent.
 */
export async function POST(req: NextRequest) {
  // Stage 1: AUTH
  const auth = await requireRole([2]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  // Stage 2: VALIDATE
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { studentId, courseId } = parsed.data;

  // Stage 3: AUTHORIZE
  const ownership = await assertCoachAssignedToStudent(auth, studentId);
  if (ownership instanceof NextResponse) return ownership;

  // Stage 4: EXECUTE
  try {
    const result = await assignCourseToStudent(supabase, { studentId, courseId });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("coach/courses/assign error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
