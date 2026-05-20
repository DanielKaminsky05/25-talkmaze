import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/services/supabase/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";

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
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { id } = await params;

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
    console.error("GET employee availability error", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { id } = await params;

  const coachUUID = await resolveCoachUUID(supabase, id);

  if (!coachUUID) {
    return NextResponse.json(
      { error: `No coach found with tw_id: ${id}` },
      { status: 404 },
    );
  }

  const {
    availability,
    timezone,
  }: { availability: Record<string, { start: string; end: string }[]>, timezone?: string } =
    await req.json();

  const { error: deleteError } = await supabase
    .from("coach_availabilities")
    .delete()
    .eq("coach_id", coachUUID);

  if (deleteError) {
    console.error("PUT employee availability delete error", deleteError);
    return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
  }

  const rows = Object.entries(availability ?? {}).flatMap(([day, slots]) =>
    slots
      .filter((s) => s.start && s.end)
      .map((s) => ({
        coach_id: coachUUID,
        weekday: DAY_MAP[day],
        start_time: new Date(`1970-01-01T${s.start}:00Z`).toISOString(),
        end_time: new Date(`1970-01-01T${s.end}:00Z`).toISOString(),
        start_time_new: `${s.start}:00`,
        end_time_new: `${s.end}:00`,
        timezone: timezone || "America/New_York", // Default fallback if not sent yet
      })),
  );

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("coach_availabilities")
      .insert(rows);

    if (insertError) {
      console.error("PUT employee availability insert error", insertError);
      return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}