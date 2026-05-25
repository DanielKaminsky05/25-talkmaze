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
  let coachId: string;
  let profileType: "student" | "parent";

  const studentOwnership = await assertCoachAssignedToStudent(auth, contactId);
  if (!(studentOwnership instanceof NextResponse)) {
    coachId = studentOwnership.coachId;
    profileType = "student";
  } else {
    const { data: studentProfile, error: studentLookupError } = await supabase
      .from("students")
      .select("id")
      .eq("id", contactId)
      .maybeSingle();

    if (studentLookupError) {
      console.error(
        "coach/conversation student lookup error",
        studentLookupError,
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    const { data: parentProfile, error: parentLookupError } = await supabase
      .from("parents")
      .select("account_id")
      .eq("id", contactId)
      .maybeSingle();

    if (parentLookupError) {
      console.error(
        "coach/conversation parent lookup error",
        parentLookupError,
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    // Existing student that failed assignment check stays forbidden.
    if (studentProfile) return studentOwnership;

    // If this UUID is neither a student nor a parent profile, surface 404.
    if (!parentProfile) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const { data: coach } = await supabase
      .from("coaches")
      .select("id")
      .eq("account_id", auth.user.id)
      .maybeSingle();

    if (!coach) {
      console.error("coach/conversation: role=2 but no coaches row", {
        userId: auth.user.id,
      });
      return NextResponse.json(
        { error: "Coach record missing" },
        { status: 500 },
      );
    }

    const { data: familyStudents, error: familyStudentsError } = await supabase
      .from("students")
      .select("id")
      .eq("account_id", parentProfile.account_id);

    if (familyStudentsError) {
      console.error(
        "coach/conversation family student lookup error",
        familyStudentsError,
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    const familyStudentIds = (familyStudents ?? []).map((s) => s.id);
    if (familyStudentIds.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from("coach_students")
      .select("student_id")
      .eq("coach_id", coach.id)
      .in("student_id", familyStudentIds)
      .limit(1)
      .maybeSingle();

    if (assignmentError) {
      console.error(
        "coach/conversation parent ownership error",
        assignmentError,
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    if (!assignment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    coachId = coach.id;
    profileType = "parent";
  }

  // Stage 4: EXECUTE
  try {
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
