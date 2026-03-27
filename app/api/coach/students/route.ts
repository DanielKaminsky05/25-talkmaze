import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch coach profile corresponding to this user
    const { data: coachData, error: coachError } = await supabase
      .from('coaches')
      .select('id')
      .eq('account_id', user.id)
      .single();

    if (coachError || !coachData) {
       return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });
    }

    // 3. Query their assigned students from the junction table
    const { data: assignments, error: assignmentsError } = await supabase
      .from("coach_students")
      .select(`
        student_id,
        students(
          id,
          name,
          tw_id,
          lesson_space_id
        )
      `)
      .eq('coach_id', coachData.id);

    if (assignmentsError) {
      console.error("Coach Students query error:", assignmentsError);
      return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
    }

    // Clean up the deeply nested objects for the frontend
    const students = assignments
      .map(a => a.students)
      .filter(Boolean); // Filter out any null values just in case

    return NextResponse.json(students);

  } catch (error) {
    console.error("Error in /api/coach/students:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
