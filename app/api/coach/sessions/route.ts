import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: coachData } = await supabase
    .from("coaches")
    .select("id")
    .eq("account_id", user.id)
    .single();

  if (!coachData) return NextResponse.json({ error: "Coach not found" }, { status: 404 });

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, start_time, end_time, weekday, student_id, students(first_name, last_name)")
    .eq("coach_id", coachData.id)
    .order("start_time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sessions });
}
