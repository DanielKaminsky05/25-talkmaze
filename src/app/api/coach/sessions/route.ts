import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/server/requireRole";

const QuerySchema = z
  .object({
    student_id: z.string().uuid().optional(),
  })
  .strict();

export async function GET(req: Request) {
  // Stage 1: AUTH
  const auth = await requireRole([2]);
  if (auth instanceof NextResponse) return auth;
  const { supabase, user } = auth;

  // Stage 2: VALIDATE
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request parameters",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  // Stage 3: AUTHORIZE — implicit scoping via coach_id filter (see
  // docs/api-ownership.md scope discussion: soft-fail with empty list when
  // ?student_id belongs to a different coach, no information leak).
  // The coach row lookup is a DATA lookup, not auth (requireRole([2]) already
  // proved role). Missing row despite role=2 is data inconsistency → 500.
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("account_id", user.id)
    .maybeSingle();
  if (!coach) {
    console.error("coach/sessions: role=2 but no coaches row", {
      userId: user.id,
    });
    return NextResponse.json(
      { error: "Coach record missing" },
      { status: 500 },
    );
  }

  // Stage 4: EXECUTE
  try {
    let query = supabase
      .from("sessions")
      .select(
        "id, start_time, end_time, weekday, student_id, requested_start_time, requested_end_time, reschedule_status, students(first_name, last_name)",
      )
      .eq("coach_id", coach.id)
      .order("start_time", { ascending: true });

    if (parsed.data.student_id) {
      query = query.eq("student_id", parsed.data.student_id);
    }

    const { data: sessions, error } = await query;
    if (error) {
      console.error("coach/sessions query error", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    return NextResponse.json({ sessions: sessions ?? [] });
  } catch (err: unknown) {
    console.error("coach/sessions error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
