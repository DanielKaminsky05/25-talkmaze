import { NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";

export async function GET() {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  try {
    const { data, error } = await supabase
      .from("booked_slots")
      .select(
        `
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
      `,
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("pending-bookings GET error", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    return NextResponse.json({ pending: data ?? [] });
  } catch (err: unknown) {
    console.error("pending-bookings GET error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
