import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { assertOwnsStudent } from "@/src/lib/auth/server/ownership";

/**
 * GET /api/parent/students/[studentId]
 *
 * Resolves the parent record for a given student. Family-side only.
 */
const ParamsSchema = z.object({ studentId: z.string().uuid() }).strict();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  // Stage 1: AUTH
  const auth = await requireRole([1]);
  if (auth instanceof NextResponse) return auth;
  const { supabase, user } = auth;

  // Stage 2: VALIDATE
  const parsed = ParamsSchema.safeParse(await params);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request parameters",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const { studentId } = parsed.data;

  // Stage 3: AUTHORIZE
  const ownership = await assertOwnsStudent(auth, studentId);
  if (ownership instanceof NextResponse) return ownership;

  // Stage 4: EXECUTE
  try {
    const { data: parentRow, error } = await supabase
      .from("parents")
      .select("id")
      .eq("account_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("parent/students/[studentId] select error", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    if (!parentRow) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }
    return NextResponse.json({ parent: { id: parentRow.id } });
  } catch (err: unknown) {
    console.error("parent/students/[studentId] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}