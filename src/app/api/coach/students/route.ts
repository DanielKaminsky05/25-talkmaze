import { NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";

export async function GET() {
  const auth = await requireRole([2]);
  if (auth instanceof NextResponse) return auth;
  const { supabase, user } = auth;

  try {
    const { data: coachData, error: coachError } = await supabase
      .from("coaches")
      .select("id")
      .eq("account_id", user.id)
      .maybeSingle();

    if (coachError) {
      console.error("coach/students coach lookup error", coachError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    if (!coachData) {
      console.error("coach/students: role=2 but no coaches row", { userId: user.id });
      return NextResponse.json(
        { error: "Coach record missing" },
        { status: 500 },
      );
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from("coach_students")
      .select(
        `
        student_id,
        students(
          id,
          first_name,
          last_name,
          lesson_space_id
        )
      `,
      )
      .eq("coach_id", coachData.id);

    if (assignmentsError) {
      console.error("coach/students query error", assignmentsError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    const students = (assignments ?? []).map((a) => a.students).filter(Boolean);
    return NextResponse.json({ students });
  } catch (err: unknown) {
    console.error("coach/students error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
