import { NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";

/**
 * Lists courses for a coach to browse when assigning one to a student.
 *
 * Auth: coach role (2). The catalog itself is not student-scoped — every coach
 * sees the full list — so no ownership check is needed here. Ownership is
 * enforced at assignment time in POST /api/coach/courses/assign.
 */
export async function GET() {
  // Stage 1: AUTH
  const auth = await requireRole([2]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  // Stage 4: EXECUTE
  try {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, description, created_at");

    if (error) {
      console.error("coach/courses GET error", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    return NextResponse.json({ courses: data ?? [] });
  } catch (err) {
    console.error("coach/courses GET error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
