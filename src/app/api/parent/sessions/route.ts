import { NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";

export async function GET() {
  const auth = await requireRole([1]);
  if (auth instanceof NextResponse) return auth;
  const { supabase, user } = auth;

  try {
    const { data: students, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("account_id", user.id);

    if (studentError) {
      console.error("parent/sessions student lookup error", studentError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ sessions: [] });
    }

    const studentIds = students.map((s) => s.id);

    const { data: sessions, error: sessionError } = await supabase
      .from("sessions")
      .select(
        `
        id,
        start_time,
        end_time,
        weekday,
        student_id,
        coach_id,
        students (first_name, last_name),
        coaches (name)
      `,
      )
      .in("student_id", studentIds)
      .order("start_time", { ascending: true });

    if (sessionError) {
      console.error("parent/sessions fetch error", sessionError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    return NextResponse.json({ sessions: sessions ?? [] });
  } catch (err: unknown) {
    console.error("parent/sessions error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
