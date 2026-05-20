import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { assertCoachAssignedToStudent } from "@/src/lib/auth/server/ownership";
import { awardProgress } from "@/src/lib/lessons/server/awardProgress";

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
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Stage 3: AUTHORIZE
  const ownership = await assertCoachAssignedToStudent(
    auth,
    parsed.data.student_id,
  );
  if (ownership instanceof NextResponse) return ownership;

  // Stage 4: EXECUTE — token + badge cascade lives in
  // src/lib/lessons/server/awardProgress (extracted per
  // api-contract.md §domain-logic-placement).
  try {
    const result = await awardProgress(supabase, parsed.data);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json(result.row);
  } catch (err: unknown) {
    console.error("coach/lesson-progress error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
