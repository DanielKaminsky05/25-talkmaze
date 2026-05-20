import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { getStudentLessonsByCourse } from "@/src/lib/lessons/server/getStudentLessonsByCourse";

const ParamsSchema = z.object({ studentId: z.string().uuid() }).strict();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const parsed = ParamsSchema.safeParse(await params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const courses = await getStudentLessonsByCourse(
      supabase,
      parsed.data.studentId,
    );
    return NextResponse.json({ courses });
  } catch (err: unknown) {
    console.error("admin/students/lessons/[studentId] GET error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
