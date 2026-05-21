import { NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";

export async function GET() {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  try {
    const { data, error } = await supabase
      .from("students")
      .select(
        "id, account_id, first_name, last_name, grade, avatar_url, location, date_of_birth, bio, is_setup_complete, lesson_space_id, created_at",
      );
    if (error) {
      console.error("admin/students GET error", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    return NextResponse.json({ students: data ?? [] });
  } catch (err: unknown) {
    console.error("admin/students GET error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
