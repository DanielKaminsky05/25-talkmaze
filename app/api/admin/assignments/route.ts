import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { TeachworksClient } from "@/lib/teachworks/client";


//fetch all assignments joined with coach/student names
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_student_assignments")
    .select(`
      id,
      coach_id,
      student_id,
      coaches(first_name, last_name),
      students(first_name, last_name)
    `);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

//add assignment + sync TW
export async function POST(req: NextRequest) {
  const { coach_id, student_id } = await req.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coach_student_assignments")
    .insert({ coach_id, student_id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: allAssignments } = await supabase
    .from("coach_student_assignments")
    .select("coach_id")
    .eq("student_id", student_id);

  // 3. Sync to Teachworks — build default_teachers array
  const teacherIds = allAssignments!.map(a => a.coach_id);
  const twClient = new TeachworksClient(process.env.TEACHWORKS_API_KEY!);
  await twClient.updateStudent(student_id, {
    default_teachers: teacherIds.map(id => ({ id }))
  });

  return NextResponse.json(data);
}