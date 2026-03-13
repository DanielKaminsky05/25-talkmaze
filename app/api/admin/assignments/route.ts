import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { TeachworksClient } from "@/lib/teachworks/client";

//fetch all assignments joined with coach/student names 
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_students")
    .select(`
      coach_id,
      student_id,
      coaches(name, tw_id),
      students(name, tw_id)
    `);
    
  if (error) {
    console.error("GET Assignments Supabase Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Inject synthetic ID for the frontend and map coach/student IDs to Teachworks IDs
  const mappedData = data.map((row: any) => ({
    id: `${row.coach_id}_${row.student_id}`, // Used strictly for the DELETE route decomposition
    coach_id: String(row.coaches?.tw_id || row.coach_id),
    student_id: String(row.students?.tw_id || row.student_id),
    coaches: { name: row.coaches?.name || null },
    students: { name: row.students?.name || null }
  }));

  return NextResponse.json(mappedData);
}

//add assignment + sync TW
export async function POST(req: NextRequest) {
  const { coach_id: tw_coach_id, student_id: tw_student_id } = await req.json();
  const supabase = await createClient();

  const { data: coachData } = await supabase.from('coaches').select('id, name').eq('tw_id', String(tw_coach_id)).single();
  const { data: studentData } = await supabase.from('students').select('id, name').eq('tw_id', String(tw_student_id)).single();

  if (!coachData) {
    console.error("404 Coach not found for TW ID:", tw_coach_id);
    return NextResponse.json({ error: "Coach not found in local TalkMaze database." }, { status: 404 });
  }
  if (!studentData) {
    console.error("404 Student not found for TW ID:", tw_student_id);
    return NextResponse.json({ error: "Student not found in local TalkMaze database." }, { status: 404 });
  }

  const coach_id = coachData.id;
  const student_id = studentData.id;

  const { error } = await supabase
    .from("coach_students")
    .insert({ coach_id, student_id });
    
  if (error) {
    console.error("POST Assignment Insert Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Find all coach ID's for this student to sync to Teachworks
  const { data: allAssignments, error: allAssignmentsError } = await supabase
    .from("coach_students")
    .select("coaches(tw_id)")
    .eq("student_id", student_id);

  if (allAssignmentsError) {
    console.error("POST Assignment Select Error:", allAssignmentsError);
  }

  // 3. Sync to Teachworks — build default_teachers array
  const twTeacherIds = allAssignments 
    ? allAssignments.filter((a: any) => a.coaches?.tw_id).map((a: any) => ({ id: Number(a.coaches.tw_id) }))
    : [{ id: Number(tw_coach_id) }];

  const twClient = new TeachworksClient(process.env.TEACHWORKS_API_KEY!);
  
  try {
    await twClient.updateStudent(tw_student_id, {
      default_teachers: twTeacherIds
    });
  } catch (e) {
    console.error("Teachworks sync failed: ", e);
  }

  // Construct fake mapped return format matching GET endpoint format
  const responseData = { 
    id: `${coach_id}_${student_id}`, 
    coach_id: String(tw_coach_id),
    student_id: String(tw_student_id),
    coaches: { name: coachData.name },
    students: { name: studentData.name }
  };
  return NextResponse.json(responseData);
}