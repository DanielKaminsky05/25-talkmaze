import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const DAY_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

async function resolveCoachUUID(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<string | null> {
  return id;
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  // ✅ convert tw_id → UUID
  const coachUUID = await resolveCoachUUID(supabase, id);

  if (!coachUUID) {
    return NextResponse.json(
      { error: `No coach found with tw_id: ${id}` },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("coach_availabilities")
    .select("weekday, start_time, end_time")
    .eq("coach_id", coachUUID); // ✅ use UUID

  if (error) {
    console.log(
      "GET error:",
      error.message,
      error.details,
      error.hint,
      error.code,
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const coachUUID = await resolveCoachUUID(supabase, id);

  if (!coachUUID) {
    return NextResponse.json(
      { error: `No coach found with tw_id: ${id}` },
      { status: 404 },
    );
  }

  const {
    availability,
  }: { availability: Record<string, { start: string; end: string }[]> } =
    await req.json();

  const { error: deleteError } = await supabase
    .from("coach_availabilities")
    .delete()
    .eq("coach_id", coachUUID);

  if (deleteError) {
    console.log(
      "DELETE error:",
      deleteError.message,
      deleteError.details,
      deleteError.hint,
      deleteError.code,
    );
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const rows = Object.entries(availability).flatMap(([day, slots]) =>
    slots
      .filter((s) => s.start && s.end)
      .map((s) => ({
        coach_id: coachUUID,
        weekday: DAY_MAP[day],
        start_time: new Date(`1970-01-01T${s.start}:00Z`).toISOString(),
        end_time: new Date(`1970-01-01T${s.end}:00Z`).toISOString(),
      })),
  );

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("coach_availabilities")
      .insert(rows);

    if (insertError) {
      console.log(
        "INSERT error:",
        insertError.message,
        insertError.details,
        insertError.hint,
        insertError.code,
      );
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}