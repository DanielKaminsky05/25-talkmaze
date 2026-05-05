import { createClient } from "@/src/services/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
        { status: 400 },
      );

    const { data: records, error } = await supabase
      .from("session_attendance")
      .select("id, session_date, session_id, status, notes, coach_id")
      .eq("student_id", studentId)
      .order("session_date", { ascending: false })
      .limit(12);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: account } = await supabase
      .from("account")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!account || (account.role !== 2 && account.role !== 3)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { student_id, session_date, status, session_id, notes } = body;

    if (!student_id || !session_date || !status) {
      return NextResponse.json(
        { error: "student_id, session_date, and status are required" },
        { status: 400 },
      );
    }

    // Auto-lookup coach_id from authenticated user's coach profile
    const { data: coachProfile } = await supabase
      .from("coaches")
      .select("id")
      .eq("account_id", user.id)
      .single();

    // Check existing record to detect status transition for sessions_remaining adjustment
    const { data: existing } = await supabase
      .from("session_attendance")
      .select("status")
      .eq("student_id", student_id)
      .eq("session_date", session_date)
      .maybeSingle();

    const { data, error } = await supabase
      .from("session_attendance")
      .upsert(
        {
          student_id,
          session_date,
          session_id: session_id ?? null,
          status,
          coach_id: coachProfile?.id ?? null,
          notes: notes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,session_date" },
      )
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // "attended" and "missed" both consume a session slot; "cancelled" does not.
    // Adjust sessions_remaining only when the consuming state changes.
    const wasConsuming =
      existing?.status === "attended" || existing?.status === "missed";
    const nowConsuming = status === "attended" || status === "missed";

    if (!wasConsuming && nowConsuming) {
      const { data: sub } = await supabase
        .from("student_subscriptions")
        .select("id, sessions_remaining")
        .eq("student_id", student_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (sub && sub.sessions_remaining != null && sub.sessions_remaining > 0) {
        await supabase
          .from("student_subscriptions")
          .update({ sessions_remaining: sub.sessions_remaining - 1 })
          .eq("id", sub.id);
      }
    } else if (wasConsuming && !nowConsuming) {
      const { data: sub } = await supabase
        .from("student_subscriptions")
        .select("id, sessions_remaining")
        .eq("student_id", student_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (sub) {
        await supabase
          .from("student_subscriptions")
          .update({ sessions_remaining: (sub.sessions_remaining ?? 0) + 1 })
          .eq("id", sub.id);
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/attendance:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
