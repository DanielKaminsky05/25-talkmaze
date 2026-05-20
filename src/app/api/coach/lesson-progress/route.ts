import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { assertCoachAssignedToStudent } from "@/src/lib/auth/server/ownership";

const BodySchema = z
  .object({
    student_id: z.string().uuid(),
    lesson_id: z.string().uuid(),
    status: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
  .strict();

export async function PATCH(request: Request) {
  // Stage 1: AUTH
  const auth = await requireRole([2]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  // Stage 2: VALIDATE
  const parsed = BodySchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const { student_id, lesson_id, status } = parsed.data;

  // Stage 3: AUTHORIZE
  const ownership = await assertCoachAssignedToStudent(auth, student_id);
  if (ownership instanceof NextResponse) return ownership;

  // Stage 4: EXECUTE — preserve existing cascade logic verbatim.
  try {
    // Upsert: if the row exists update it; if not, create it.
    const { data, error } = await supabase
      .from("lesson_progress")
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
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    const { data: token } = await supabase
      .from("tokens")
      .select("id")
      .eq("lesson_id", lesson_id)
      .maybeSingle();

    if (token) {
      if (status === 3) {
        await supabase.from("student_tokens").upsert(
          {
            student_id,
            token_id: token.id,
            awarded_at: new Date().toISOString(),
          },
          { onConflict: "student_id,token_id" },
        );
      } else {
        await supabase
          .from("student_tokens")
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
              supabase
                .from("lesson_progress")
                .select("lesson_id")
                .eq("student_id", student_id)
                .eq("status", 3),
            ]);
          const completedIds = new Set(
            (completedRows ?? []).map((r) => r.lesson_id),
          );
          const allDone = (allLessons ?? []).every((l) =>
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
  } catch (err: unknown) {
    console.error("coach/lesson-progress error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
