import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: coachData } = await supabase
    .from("coaches")
    .select("id")
    .eq("account_id", user.id)
    .single();

  if (!coachData)
    return NextResponse.json({ error: "Coach not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("student_id");

  let query = supabase
    .from("sessions")
    .select(
      "id, start_time, end_time, weekday, student_id, students(first_name, last_name)",
    )
    .eq("coach_id", coachData.id)
    .order("start_time", { ascending: true });

  if (studentId) query = query.eq("student_id", studentId);

  const { data: sessions, error } = await query;

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sessions });
}
