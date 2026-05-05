import { NextResponse } from "next/server";
import { createClient } from "@/src/services/supabase/server";

/**
 * PATCH /api/coach/lesson-feedback
 *
 * Saves (or creates) a coach's written feedback for a student/lesson pair.
 * Uses upsert so can call this repeatedly without creating duplicate rows.
 *
 * Both feedback fields are HTML strings produced by Tiptap's FeedbackEditor.
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { student_id, lesson_id, positive_feedback, improvement_feedback } =
      body;

    if (!student_id || !lesson_id) {
      return NextResponse.json(
        { error: "Missing required fields: student_id, lesson_id" },
        { status: 400 },
      );
    }

    const { data, error } = await (supabase.from("lesson_progress") as any)
      .upsert(
        {
          student_id,
          lesson_id,
          positive_feedback: positive_feedback ?? null,
          improvement_feedback: improvement_feedback ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,lesson_id" },
      )
      .select()
      .single();

    if (error) {
      console.error("Upsert feedback error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/coach/lesson-feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
