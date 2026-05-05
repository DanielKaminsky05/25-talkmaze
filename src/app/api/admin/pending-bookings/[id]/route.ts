import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/src/services/supabase/service";

function normalizeTime(value: unknown) {
  if (typeof value !== "string") return null;
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  const weekday = Number(body.weekday);
  const startTime = normalizeTime(body.start_time);
  const endTime = normalizeTime(body.end_time);
  const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";
  const numSessions = Number(body.num_sessions);
  const coachId = typeof body.coach_id === "string" ? body.coach_id.trim() : "";
  const startDate = typeof body.start_date === "string" ? body.start_date.trim() : "";

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return NextResponse.json({ error: "Weekday must be between 0 and 6" }, { status: 400 });
  }

  if (!startTime || !endTime || startTime >= endTime) {
    return NextResponse.json({ error: "Start and end times must be valid, with start before end" }, { status: 400 });
  }

  if (!timezone) {
    return NextResponse.json({ error: "Timezone is required" }, { status: 400 });
  }

  if (!Number.isInteger(numSessions) || numSessions <= 0) {
    return NextResponse.json({ error: "Number of sessions must be a positive integer" }, { status: 400 });
  }

  if (!coachId) {
    return NextResponse.json({ error: "Coach is required" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return NextResponse.json({ error: "Start date must be a valid date" }, { status: 400 });
  }

  const startDateWeekday = new Date(`${startDate}T12:00:00Z`).getUTCDay();
  if (startDateWeekday !== weekday) {
    return NextResponse.json({ error: "Start date must match the selected weekday" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("id", coachId)
    .maybeSingle();

  if (!coach) {
    return NextResponse.json({ error: "Selected coach was not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("booked_slots")
    .update({
      coach_id: coachId,
      weekday,
      start_date: startDate,
      start_time: startTime,
      end_time: endTime,
      timezone,
      num_sessions: numSessions,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select(`
      id,
      coach_id,
      student_id,
      weekday,
      start_time,
      start_date,
      end_time,
      timezone,
      status,
      num_sessions,
      created_at,
      coaches(first_name, last_name),
      students(first_name, last_name, account_id)
    `)
    .single();

  if (error) {
    console.error("PATCH pending booking error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
