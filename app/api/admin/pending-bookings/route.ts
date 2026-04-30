import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/services/supabase/service";

export async function GET() {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("booked_slots")
    .select(`
      id,
      coach_id,
      student_id,
      weekday,
      start_time,
      end_time,
      timezone,
      status,
      num_sessions,
      created_at,
      coaches(first_name, last_name),
      students(first_name, last_name, account_id)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("GET pending bookings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
