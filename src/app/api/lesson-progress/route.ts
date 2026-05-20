import { NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";

export async function GET(_req: Request) {
  const auth = await requireRole([1, 2, 3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase, user } = auth;

  try {
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("account_id", user.id)
      .maybeSingle();
    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 },
      );
    }

    const [completed, total] = await Promise.all([
      supabase
        .from("lesson_progress")
        .select("*", { count: "exact", head: true })
        .eq("student_id", student.id)
        .eq("status", 1),
      supabase.from("lessons").select("*", { count: "exact", head: true }),
    ]);
    if (completed.error || total.error) {
      console.error(
        "lesson-progress count error",
        completed.error ?? total.error,
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    return NextResponse.json({
      completed: completed.count ?? 0,
      total: total.count ?? 24,
      studentId: student.id,
    });
  } catch (err: unknown) {
    console.error("lesson-progress error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
