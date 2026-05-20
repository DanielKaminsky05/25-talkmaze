import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/src/services/supabase/service";
import { requireRole } from "@/src/lib/auth/server/requireRole";

export async function GET() {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("booked_slots")
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
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("GET pending bookings error:", error);
    return NextResponse.json({ error: "Failed to fetch pending bookings" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
