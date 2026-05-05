import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/services/supabase/server";

const DAY_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

async function verifyOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("account_id", userId)
    .maybeSingle();
  return !!data;
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await verifyOwnership(supabase, studentId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("student_availabilities")
    .select("weekday, start_time, end_time, timezone")
    .eq("student_id", studentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await verifyOwnership(supabase, studentId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const {
    availability,
    timezone,
  }: {
    availability: Record<string, { start: string; end: string }[]>;
    timezone: string;
  } = await req.json();

  const { error: deleteError } = await supabase
    .from("student_availabilities")
    .delete()
    .eq("student_id", studentId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const rows = Object.entries(availability).flatMap(([day, slots]) =>
    slots
      .filter((s) => s.start && s.end)
      .map((s) => ({
        student_id: studentId,
        weekday: DAY_MAP[day],
        start_time: new Date(`1970-01-01T${s.start}:00Z`).toISOString(),
        end_time: new Date(`1970-01-01T${s.end}:00Z`).toISOString(),
        start_time_new: `${s.start}:00`,
        end_time_new: `${s.end}:00`,
        timezone,
      })),
  );

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("student_availabilities")
      .insert(rows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
