import { NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";

export async function GET() {
  const auth = await requireRole([1]);
  if (auth instanceof NextResponse) return auth;
  const { supabase, user } = auth;

  try {
    const { data: students, error: studentError } = await supabase
      .from("students")
      .select(
        `
        id,
        first_name,
        last_name,
        grade,
        avatar_url,
        location,
        date_of_birth,
        bio,
        student_subscriptions (
          sessions_remaining,
          status
        )
      `,
      )
      .eq("account_id", user.id);

    if (studentError) {
      console.error("parent/students fetch error", studentError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    const studentList = (students ?? []).map((s) => {
      const subscription = s.student_subscriptions?.[0] || null;
      return {
        id: s.id,
        name: `${s.first_name || ""} ${s.last_name || ""}`.trim(),
        first_name: s.first_name,
        last_name: s.last_name,
        grade: s.grade,
        avatar_url: s.avatar_url,
        location: s.location,
        date_of_birth: s.date_of_birth,
        bio: s.bio,
        remaining_lessons: subscription?.sessions_remaining ?? 0,
        status: subscription?.status || "inactive",
      };
    });

    return NextResponse.json({ students: studentList });
  } catch (err: unknown) {
    console.error("parent/students error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
