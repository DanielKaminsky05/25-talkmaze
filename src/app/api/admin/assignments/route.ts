import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth/server/requireRole";
import type { Assignment } from "@/src/app/(protected)/admin/_types";
//fetch all assignments joined with coach/student names

type AssignmentRow = {
  coach_id: string | null;
  student_id: string | null;
  coaches: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  students: {
    first_name: string | null;
    last_name: string | null;
    account_id: string | null;
  } | null;
};

/**
 * Lists coach-student assignments with basic coach/student display fields.
 *
 * @returns JSON array of assignments shaped for admin UI consumption.
 */
export async function GET() {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;
  const { data, error } = await supabase.from("coach_students").select(`
      coach_id,
      student_id,
      coaches(first_name, last_name),
      students(first_name, last_name, account_id)
    `);

  if (error) {
    console.error("GET Assignments Supabase Error:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }

  // Return original Supabase UUIDs for the frontend to match with its local cache
  const mappedData = (data as AssignmentRow[]).map((row) => ({
    id: `${row.coach_id}_${row.student_id}`, // Used strictly for the DELETE route decomposition
    coach_id: String(row.coach_id),
    student_id: String(row.student_id),
    coaches: {
      first_name: row.coaches?.first_name ?? null,
      last_name: row.coaches?.last_name ?? null,
    },
    students: {
      first_name: row.students?.first_name ?? null,
      last_name: row.students?.last_name ?? null,
      account_id: row.students?.account_id ?? null,
    },
  }));

  return NextResponse.json(mappedData);
}

/**
 * Creates a new coach-student assignment row in `coach_students`.
 *
 * @param req Request body containing `coach_id` and `student_id`.
 * @returns JSON assignment object for immediate UI insertion.
 */
export async function POST(req: NextRequest) {
  const auth = await requireRole([3]);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { coach_id: coach_id_1, student_id: student_id_1 } = await req.json();

  const { data: coachData } = await supabase
    .from("coaches")
    .select("id, first_name, last_name")
    .eq("id", String(coach_id_1))
    .single();
  const { data: studentData } = await supabase
    .from("students")
    .select("id, first_name, last_name, account_id")
    .eq("id", String(student_id_1))
    .single();

  if (!coachData) {
    return NextResponse.json(
      { error: "Coach not found in local TalkMaze database." },
      { status: 404 },
    );
  }
  if (!studentData) {
    return NextResponse.json(
      { error: "Student not found in local TalkMaze database." },
      { status: 404 },
    );
  }

  const coach_id = coachData.id;
  const student_id = studentData.id;

  const { error } = await supabase
    .from("coach_students")
    .insert({ coach_id, student_id });

  if (error) {
    console.error("POST Assignment Insert Error:", error);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }

  const newAssignment: Assignment = {
    id: `${coach_id}_${student_id}`,
    coach_id: coach_id,
    student_id: student_id,
    coaches: {
      first_name: coachData?.first_name ?? null,
      last_name: coachData?.last_name ?? null,
    },
    students: {
      first_name: studentData?.first_name ?? null,
      last_name: studentData?.last_name ?? null,
      account_id: studentData?.account_id ?? null,
    },
  };

  return NextResponse.json(newAssignment);
}
