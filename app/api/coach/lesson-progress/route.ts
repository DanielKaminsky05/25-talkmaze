import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(request: Request) {
  try {
    console.log("Inside PATCH");
    const supabase = await createClient();

    // Authenticate
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { student_id, lesson_id, status } = body;

    if (!student_id || !lesson_id || status === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: student_id, lesson_id, status" },
        { status: 400 },
      );
    }

    if (![1, 2, 3].includes(status)) {
      return NextResponse.json(
        {
          error:
            "Invalid status. Must be 1 (not started), 2 (in progress), or 3 (done).",
        },
        { status: 400 },
      );
    }

    // Upsert: if the row exists update it; if not, create it.
    const { data, error } = await (supabase.from("lesson_progress") as any)
      .upsert(
        {
          student_id,
          lesson_id,
          status,
          // Set completed_at when status transitions to 3 (done)
          completed_at: status === 3 ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,lesson_id" },
      )
      .select()
      .single();

    if (error) {
      console.error("Upsert progress error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: token } = await (supabase.from("tokens") as any)
      .select("id")
      .eq("lesson_id", lesson_id)
      .maybeSingle();

    if (token) {
      if (status === 3) {
        await (supabase.from("student_tokens") as any).upsert(
          {
            student_id,
            token_id: token.id,
            awarded_at: new Date().toISOString(),
          },
          { onConflict: "student_id,token_id" },
        );
      } else {
        await (supabase.from("student_tokens") as any)
          .delete()
          .eq("student_id", student_id)
          .eq("token_id", token.id);
      }
    }

    // Badge award/retract logic
    const { data: lessonRow } = await supabase
      .from("lessons")
      .select("course_id")
      .eq("id", lesson_id)
      .maybeSingle();

    if (lessonRow?.course_id) {
      const course_id = lessonRow.course_id;
      const { data: badge } = await supabase
        .from("badges")
        .select("id")
        .eq("course_id", course_id)
        .maybeSingle();

      if (badge) {
        if (status === 3) {
          const [{ data: allLessons }, { data: completedRows }] =
            await Promise.all([
              supabase.from("lessons").select("id").eq("course_id", course_id),
              (supabase.from("lesson_progress") as any)
                .select("lesson_id")
                .eq("student_id", student_id)
                .eq("status", 3),
            ]);
          const completedIds = new Set(
            (completedRows ?? []).map((r: any) => r.lesson_id),
          );
          const allDone = (allLessons ?? []).every((l: any) =>
            completedIds.has(l.id),
          );
          if (allDone) {
            await supabase.from("student_badges").upsert(
              {
                student_id,
                badge_id: badge.id,
                awarded_at: new Date().toISOString(),
              },
              { onConflict: "student_id,badge_id" },
            );
          }
        } else {
          await supabase
            .from("student_badges")
            .delete()
            .eq("student_id", student_id)
            .eq("badge_id", badge.id);
        }
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/coach/lesson-progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
