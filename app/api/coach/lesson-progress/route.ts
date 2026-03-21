import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    // Authenticate
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { student_id, lesson_id, status } = body;

    if (!student_id || !lesson_id || status === undefined) {
      return NextResponse.json({ error: "Missing required fields: student_id, lesson_id, status" }, { status: 400 });
    }

    if (![1, 2, 3].includes(status)) {
      return NextResponse.json({ error: "Invalid status. Must be 1 (not started), 2 (in progress), or 3 (done)." }, { status: 400 });
    }

    // Upsert: if the row exists update it; if not, create it.
    // Cast to `any` to work around stale TS type generation where lesson_id is mistyped.
    const { data, error } = await (supabase
      .from("lesson_progress") as any)
      .upsert(
        {
          student_id,
          lesson_id,
          status,
          // Set completed_at when status transitions to 3 (done)
          completed_at: status === 3 ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,lesson_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Upsert progress error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error("Error in PATCH /api/coach/lesson-progress:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
