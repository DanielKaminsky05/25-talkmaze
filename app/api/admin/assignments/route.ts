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
  const { coach_id: coach_id_1, student_id: student_id_1 } = await req.json();
  const supabase = await createClient();
  console.log("Coach_id: " + coach_id_1);
  console.log("Student_id: " + student_id_1)
 
  const { data: coachData } = await supabase.from('coaches').select('id, name').eq('id', String(coach_id_1)).single();
  const { data: studentData } = await supabase.from('students').select('id, name').eq('id', String(student_id_1)).single();

  console.log("Coach Data: " + coachData);
  console.log("Student Data :" + studentData);
  if (!coachData) {
    console.error("404 Coach not found for TW ID:", coach_id_1);
    return NextResponse.json({ error: "Coach not found in local TalkMaze database." }, { status: 404 });
  }
  if (!studentData) {
    console.error("404 Student not found for TW ID:", student_id_1);
    return NextResponse.json({ error: "Student not found in local TalkMaze database." }, { status: 404 });
  }

  const coach_id = coachData.id;
  const student_id = studentData.id;

  const { error } = await supabase
    .from("coach_students")
    .insert({ coach_id, student_id });
  
    //make lessonspace room on assignment

    const lesson_space_base = process.env.LESSONSPACE_BASE_URL

    if(!lesson_space_base){
      return NextResponse.json({error: 404, message: "Unable to find Lessonspace api base url"})
    }

    //get the student lessonspace room

    const {data: student_room, error: supabase_room_error} = await supabase.from('students').select('lesson_space_id').eq("id",student_id).single();

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
        name: studentData.name,
        transcribe: true,
        summarize: true,
        record_av: true,
        user:{
          id: coach_id,
          role: 'teacher',
          leader: true,
          custom_jwt_parameters: {
              meta: {
                  displayName: `Coach ${coachData.name}`,
                  lessonTitle: `${studentData.name} Public Speaking Room!`
              }
          }
        }
      })

    })

    const make_coach_url_res_json = await make_coach_url_res.json();
    console.log("Made room New: " + JSON.stringify(make_coach_url_res_json));
    //save this into supabase for the teacher

    const insert_teacher_url = await supabase.from('students').update({lesson_space_teacher_link: make_coach_url_res_json.client_url}).eq("id",student_id)

    if(insert_teacher_url.error){
      console.log("Error inserting teacher url: " + insert_teacher_url.error);
      return NextResponse.json({error: 500, message: "Error inserting teacher lessonspace url link into students table in supabase"});
    }
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

  // 3. Sync to Teachworks — build default_teacher_ids array
  const twTeacherIds = allAssignments 
    ? allAssignments.filter((a: any) => a.coaches?.tw_id).map((a: any) => Number(a.coaches.tw_id))
    : [Number(coach_id_1)];

  const twClient = new TeachworksClient(process.env.TEACHWORKS_API_KEY!);
  
  try {
    await twClient.updateStudent(student_id_1, {
      default_teacher_ids: twTeacherIds
    });
  } catch (e) {
    console.error("Teachworks sync failed: ", e);
  }

  // Construct fake mapped return format matching GET endpoint format
  const responseData = { 
    id: `${coach_id}_${student_id}`, 
    coach_id: String(coach_id_1),
    student_id: String(student_id_1),
    coaches: { name: coachData.name },
    students: { name: studentData.name }
  };
  return NextResponse.json(responseData);
}