import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/services/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const s = body.student;

    if (!s || typeof s !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const EDITABLE_FIELDS = [
      "first_name",
      "last_name",
      "date_of_birth",
      "grade",
      "location",
      "bio",
      "avatar_url",
      "lesson_space_id",
      "lesson_space_student_link",
      "lesson_space_teacher_link",
      "post_lesson_days",
      "post_lesson_tasks_enabled",
      "notes",
    ] as const;

    type StudentPayload = {
      first_name?: string | null;
      last_name?: string | null;
      date_of_birth?: string | null;
      grade?: string | null;
      location?: string | null;
      bio?: string | null;
      avatar_url?: string | null;
      lesson_space_id?: string | null;
      lesson_space_student_link?: string | null;
      lesson_space_teacher_link?: string | null;
      post_lesson_days?: number;
      post_lesson_tasks_enabled?: boolean;
      notes?: string | null;
    };
    const payload: StudentPayload = {};
    for (const field of EDITABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(s, field)) {
        (payload as Record<string, unknown>)[field] = s[field] ?? null;
      }
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: updated, error } = await supabase
      .from("students")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}
