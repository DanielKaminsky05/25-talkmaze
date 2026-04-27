import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";
import type { Database } from "@/services/supabase/types/database";
import type { Assignment } from "@/lib/types/assignments";
import { Josefin_Slab } from "next/font/google";
//fetch all assignments joined with coach/student names 

type student = Database['public']['Tables']['students']['Row']
type Coach = Database['public']['Tables']['coaches']['Row']
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_students")
    .select(`
      coach_id,
      student_id,
      coaches(first_name, last_name),
      students(first_name, last_name)
    `);

  if (error) {
    console.error("GET Assignments Supabase Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return original Supabase UUIDs for the frontend to match with its local cache
  const mappedData = data.map((row: any) => ({
    id: `${row.coach_id}_${row.student_id}`, // Used strictly for the DELETE route decomposition
    coach_id: String(row.coach_id),
    student_id: String(row.student_id),
    coaches: { name: row.coaches ? `${row.coaches.first_name || ""} ${row.coaches.last_name || ""}`.trim() : null },
    students: { name: row.students ? `${row.students.first_name || ""} ${row.students.last_name || ""}`.trim() : null }
  }));

  return NextResponse.json(mappedData);
}
//add assignment + sync TW
export async function POST(req: NextRequest) {
  const { coach_id: coach_id_1, student_id: student_id_1 } = await req.json();
  const supabase = await createClient();
  console.log("Coach_id: " + coach_id_1);
  console.log("Student_id: " + student_id_1)

  const { data: coachData } = await supabase.from('coaches').select('id, first_name, last_name').eq('id', String(coach_id_1)).single();
  const { data: studentData } = await supabase.from('students').select('id, first_name, last_name').eq('id', String(student_id_1)).single();

  console.log("Coach Data: " + JSON.stringify(coachData));
  console.log("Student Data :" + JSON.stringify(studentData));
  if (!coachData) {
    
    return NextResponse.json({ error: "Coach not found in local TalkMaze database." }, { status: 404 });
  }
  if (!studentData) {
    
    return NextResponse.json({ error: "Student not found in local TalkMaze database." }, { status: 404 });
  }

  const coach_id = coachData.id;
  const student_id = studentData.id;

  const { error } = await supabase
    .from("coach_students")
    .insert({ coach_id, student_id });
  //save this into supabase for the teacher
  //const make_coach_url_res_json = await CreateTeacherRoom(studentData, coachData)
  //const insert_teacher_url = await (supabase.from('students') as any).update({ lesson_space_teacher_link: make_coach_url_res_json.client_url }).eq("id", student_id)

  // if (insert_teacher_url.error) {
  //   console.log("Error inserting teacher url: " + insert_teacher_url.error);
  //   return NextResponse.json({ error: 500, message: "Error inserting teacher lessonspace url link into students table in supabase" });
  // }
  if (error) {
    console.error("POST Assignment Insert Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const newAssignment: Assignment = {
    id: `${coach_id}_${student_id}`,
    coach_id: coach_id,
    student_id: student_id,
    coaches: { name: coachData ? `${coachData.first_name || ""} ${coachData.last_name || ""}`.trim() : null },
    students: { name: studentData ? `${studentData.first_name || ""} ${studentData.last_name || ""}`.trim() : null }
  }


  return NextResponse.json(newAssignment)
  

}

export async function CreateTeacherRoom(studentData: student, coachData: Coach) {
  const supabase = await createClient();
  const lesson_space_base = process.env.LESSONSPACE_BASE_URL

    if(!lesson_space_base){
      return NextResponse.json({error: 404, message: "Unable to find Lessonspace api base url"})
    }

    //get the student lessonspace room

    const {data: student_room, error: supabase_room_error} = await supabase.from('students').select('lesson_space_id').eq("id",studentData.id).single();

    if(!student_room || supabase_room_error){
      return NextResponse.json({status: 400, message: "Student does not currently have a lessonspace " + supabase_room_error});
    }

    console.log("Found student room id: " + student_room.lesson_space_id)
    console.log("Trying to get coach link");
    console.log("URL: " + `${lesson_space_base}/spaces/launch/`);
    const make_coach_url_res = await fetch(`${lesson_space_base}/spaces/launch/`,{
      method: 'POST',
      headers: {
        'Authorization': `Organisation ${process.env.LESSONSPACE_API_KEY!.trim()}`,
        'Content-Type': 'application/json'
      },body: JSON.stringify({
        id: student_room.lesson_space_id,
        name: `${studentData.first_name || ""} ${studentData.last_name || ""}`.trim(),
        transcribe: true,
        summarise: true,
        record_av: true,
        user:{
          id: coachData.id,
          role: 'teacher',
          leader: true,
          custom_jwt_parameters: {
              meta: {
                  displayName: `Coach ${coachData.first_name} ${coachData.last_name}`,
                  lessonTitle: `${studentData.first_name} ${studentData.last_name} Public Speaking Room!`
              }
          }
        }
      })

  })

  const make_coach_url_res_json = await make_coach_url_res.json();

  console.log("Made room New: " + JSON.stringify(make_coach_url_res_json));
  return make_coach_url_res_json
}