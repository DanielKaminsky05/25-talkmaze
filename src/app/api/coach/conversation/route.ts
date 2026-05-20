import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import { assertCoachAssignedToStudent } from "@/src/lib/auth/server/ownership";

const QuerySchema = z
  .object({
    contactId: z.string().uuid(),
  })
  .strict();

export async function GET(request: Request) {
  // Stage 1: AUTH
  const auth = await requireRole([2]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  // Stage 2: VALIDATE
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
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
  const { contactId } = parsed.data;

  // Stage 3: AUTHORIZE
  const ownership = await assertCoachAssignedToStudent(auth, contactId);
  if (ownership instanceof NextResponse) return ownership;
  const { coachId } = ownership;

  // Stage 4: EXECUTE
  try {
    // The route historically supports student OR parent contacts. The contract
    // test only exercises the student path; keep both branches to preserve UI.
    const { data: studentProfile } = await supabase
      .from("students")
      .select("id")
      .eq("id", contactId)
      .maybeSingle();
    const profileType = studentProfile ? "student" : "parent";

    const { data: conv, error } = await supabase
      .from("conversations")
      .upsert(
        {
          coach_id: coachId,
          profile_id: contactId,
          profile_type: profileType,
        },
        { onConflict: "coach_id,profile_id" },
      )
      .select("id")
      .single();

    if (error) {
      console.error("coach/conversation upsert error", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    return NextResponse.json({ conversationId: conv.id });
  } catch (err: unknown) {
    console.error("coach/conversation error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
