import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/service";
import { createClient } from "@/utils/supabase/server";
const base_url = "https://api.thelessonspace.com/v2/organizations/30106/";

export async function GET(req: NextRequest) {
  console.log("Inside learning_space fetch");

  //check if api key is missing
  if (!process.env.LESSONSPACE_API_KEY) {
    return NextResponse.json(
      { success: false, message: "Lessonspace API KEY missing" },
      { status: 404 },
    );
  }
  try {
    const URL = `base_url${fetch}`;
    console.log("fetching");
    const response = await fetch(URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Organization ${process.env.LESSONSPACE_API_KEY}`,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      console.log("response not ok: " + text);
      return NextResponse.json({
        status: 500,
      });
    }
    console.log("response ok");

    const response_json = await response.json();
    console.log("Lesson space response: " + response_json);

    return response_json;
  } catch (err) {
    return NextResponse.json({
      status: 500,
    });
  }
}

export async function POST(req: NextRequest) {
  console.log("Inside Lessonspace POST");

  const supabase = await createClient();
  const URL = "https://api.thelessonspace.com/v2/spaces/launch/";

  try {
    const { student_id } = await req.json();

    if (!student_id) {
      return NextResponse.json({ status: 400, message: "Missing student_id" });
    }

    const { data: student, error } = await supabase
      .from("students")
      .select("lesson_space_id, first_name, last_name")
      .eq("id", student_id)
      .single();

    if (error || !student) {
      return NextResponse.json({
        status: 404,
        message: "Student not found",
      });
    }

    const fullName = `${student.first_name || ""} ${student.last_name || ""}`.trim();
    let lesson_space_id = student.lesson_space_id;
    console.log("Dat van has : " + lesson_space_id);
    if (!lesson_space_id) {
      lesson_space_id = crypto.randomUUID();
      console.log("Creating new lesson space:", lesson_space_id);
      const createJson = await CreateRoomParticipant(fullName,lesson_space_id, student_id, true)
      // Update student table
      const { error: updateError } = await supabase
        .from("students")
        .update({
          lesson_space_id: lesson_space_id,
        })
        .eq("id", student_id);

      if (updateError) {
        return NextResponse.json({ status: 500, message: "Error updating supabase: " + updateError.message });
      }

      return NextResponse.json({ success: true, url: createJson.client_url });
    }

    // If room already exists, we might still want to return the link or refresh it
    return NextResponse.json({ success: true, message: "Room already exists" });

  } catch (err) {
    return NextResponse.json({
      status: 500,
      message: "Error creating lessonspace " + err,
    });
  }
}

//function to add a new participant to a room
export async function CreateRoomParticipant(fullName: String, lesson_space_id: string, student_id: string, start: boolean){
    
   const URL = "https://api.thelessonspace.com/v2/spaces/launch/";
   console.log("Used url: " + URL)
   
   
   const supabase = await createClient();
   const lesson_space_webhook_url = process.env.LESSONSPACE_WEBHOOK_URL;

   if(!lesson_space_webhook_url){
      return NextResponse.json({status: 404, message: "Lessonspace webhook url not found"})
   }
   let createRes: Response;

   if(start){
    console.log("Setting participant room with webhook");
    console.log("webhook url: " + lesson_space_webhook_url);
    createRes = await fetch(URL, {
       method: "POST",
        headers: {
          Authorization: `Organisation ${process.env.LESSONSPACE_API_KEY!.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: lesson_space_id,
          name: fullName,
          transcribe: true,
          summarise: true,
          record_av: true,
          user: {
            role: "participant",
            custom_jwt_parameters: {
              meta: {
                displayName: fullName,
                lessonTitle: `${fullName} Public Speaking Room!`,
              },
            },
          },
          webhooks:{
            session: {
              start: lesson_space_webhook_url
            },
            transcription:{
              finish: lesson_space_webhook_url
            },
            summary:{
              finish: lesson_space_webhook_url
            }
          }
        }),
    })

    
   }else{
    console.log("Not webhook participant block")
    createRes = await fetch(URL, {
        method: "POST",
        headers: {
          Authorization: `Organisation ${process.env.LESSONSPACE_API_KEY!.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: lesson_space_id,
          name: fullName,
          transcribe: true,
          summarise: true,
          record_av: true,
          user: {
            role: "participant",
            custom_jwt_parameters: {
              meta: {
                displayName: fullName,
                lessonTitle: `${fullName} Public Speaking Room!`,
              },
            },
          },
        }),
      });
   }
   

      const createJson = await createRes.json();

      console.log("Student room: " + JSON.stringify(createJson))
      if (!createRes.ok) {
        console.error(createJson);
        return NextResponse.json({
          status: 500,
          message: "Lessonspace error",
        });
      }


      //insert into supabase

      const {data:insertLink, error: insertLinkError} = await supabase.from('students').update({lesson_space_student_link: createJson.client_url, webhook_room_id: createJson.room_id}).eq('id',student_id)
      return createJson;
}


