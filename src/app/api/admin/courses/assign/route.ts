import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { assignCourseToStudent } from "@/src/lib/lessons/server/assignCourseToStudent";
import { reconcileActiveCourseAfterUnassign } from "@/src/lib/lessons/server/setActiveCourse";

const BodySchema = z
  .object({
    studentId: z.string().uuid(),
    courseId: z.string().uuid(),
  })
  .strict();

const QuerySchema = z
  .object({
    course_id: z.string().uuid(),
  })
  .strict();

export async function POST(req: NextRequest) {
  // Stage 1: AUTH
  const auth = await requireRole([3]);
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

  // Stage 4: EXECUTE
  try {
    const result = await assignCourseToStudent(supabase, {
      studentId,
      courseId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json({ success: true, action: result.action });
  } catch (err) {
    console.error("courses/assign error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  // Stage 1: AUTH
  const auth = await requireRole([3]);
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

  // Stage 4: EXECUTE — soft delete via isActive=false. Idempotent.
  try {
    const { error } = await supabase
      .from("course_assignment")
      .update({ isActive: false })
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .eq("isActive", true);
    if (error) {
      console.error("admin courses/assign DELETE error", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    await reconcileActiveCourseAfterUnassign(supabase, studentId, courseId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("admin courses/assign DELETE error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  // Stage 1: AUTH
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  // Stage 2: VALIDATE
  const parsedQuery = QuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: parsedQuery.error.flatten(),
      },
      { status: 400 },
    );
  }
  const { course_id } = parsedQuery.data;

  // Stage 4: EXECUTE — only consider active assignments when filtering
  // out already-assigned students, so soft-deleted assignments correctly
  // reappear in the assignable list.
  const { data: assigned, error: assignedError } = await supabase
    .from("course_assignment")
    .select("student_id")
    .eq("course_id", course_id)
    .eq("isActive", true);

  if (assignedError) {
    console.error("courses/assign GET: fetch assigned error", assignedError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const assignedIds = new Set((assigned ?? []).map((a) => a.student_id));

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("*");

  if (studentsError) {
    console.error("courses/assign GET: fetch students error", studentsError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const filtered = (students ?? []).filter((s) => !assignedIds.has(s.id));

  return NextResponse.json({ students: filtered });
}
