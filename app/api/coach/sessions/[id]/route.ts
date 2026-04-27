import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: coachData } = await supabase
    .from("coaches")
    .select("id")
    .eq("account_id", user.id)
    .single();

  if (!coachData) return NextResponse.json({ error: "Coach not found" }, { status: 404 });

  const { id } = await params;
  const { start_time, end_time } = await request.json();

  if (!start_time || !end_time) {
    return NextResponse.json({ error: "start_time and end_time are required" }, { status: 400 });
  }

  const sessionId = Number(id);

  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("coach_id", coachData.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const { error } = await supabase
    .from("sessions")
    .update({ start_time, end_time })
    .eq("id", sessionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
