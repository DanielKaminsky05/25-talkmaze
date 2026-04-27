import { createClient } from "@/services/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/attendance?student_id=<uuid>
 *
 * Returns the last 12 attendance records for a student (newest first),
 * plus a computed streak count.
 *
 * Streak rules:
 * "attended"  - increments the streak
 * "cancelled" - skipped (does not count toward or break the streak)
 * "missed"    - breaks the streak
 *
 * Used by the coach dashboard to display a student's attendance history.
 * The parent dashboard fetches attendance server-side in page.tsx instead.
 *
 * Response: { attendance: AttendanceRecord[], streak: number }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    if (!studentId)
      return NextResponse.json(
        { error: "student_id is required" },
        { status: 400 }
      );

    // Fetch the most recent 12 records for this student
    const { data: records, error } = await supabase
      .from("session_attendance")
      .select("id, session_date, status, notes, coach_id")
      .eq("student_id", studentId)
      .order("session_date", { ascending: false })
      .limit(12);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Compute streak: count consecutive "attended",
    // skip "cancelled", stop on first "missed"
    let streak = 0;
    for (const record of records ?? []) {
      if (record.status === "attended") {
        streak++;
      } else if (record.status === "cancelled") {
        continue;
      } else {
        break;
      }
    }

    return NextResponse.json({ attendance: records ?? [], streak });
  } catch (error: any) {
    console.error("Error in GET /api/attendance:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/attendance
 *
 * Creates or updates an attendance record for a specific student + date.
 * Uses upsert on (student_id, session_date) so re-submitting the same date
 * updates the existing record rather than creating a duplicate.
 *
 * Auth: restricted to coaches (role=2) and admins (role=3).
 *
 * Request body:
 *   {
 *     student_id:   string (uuid, required)
 *     session_date: string (ISO timestamp, required)
 *     status:       "attended" | "missed" | "cancelled" (required)
 *     coach_id:     string (uuid, optional)
 *     notes:        string (optional)
 *   }
 *
 * Response: the created/updated session_attendance row (201)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only coaches (role=2) and admins (role=3) can write attendance
    const { data: account } = await supabase
      .from("account")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!account || (account.role !== 2 && account.role !== 3)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { student_id, session_date, status, coach_id, notes } = body;

    if (!student_id || !session_date || !status) {
      return NextResponse.json(
        { error: "student_id, session_date, and status are required" },
        { status: 400 }
      );
    }

    // Upsert: if a record already exists for this student + date, update it
    const { data, error } = await supabase
      .from("session_attendance")
      .upsert(
        {
          student_id,
          session_date,
          status,
          coach_id: coach_id ?? null,
          notes: notes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,session_date" }
      )
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/attendance:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
