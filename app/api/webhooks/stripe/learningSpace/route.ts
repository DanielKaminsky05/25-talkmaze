

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const base_url = "https://api.thelessonspace.com/v2/organizations/30106/"


export async function GET(req: NextRequest){
    console.log("Inside learning_space fetch")
    
    //check if api key is missing
    if(!process.env.LESSONSPACE_API_KEY){
        return NextResponse.json(
            {success: false, message: 'Lessonspace API KEY missing'},
            {status: 404}
        )
    }
    try{
        const URL = `base_url${fetch}`
        console.log("fetching");
        const response = await fetch(URL, {
            method: "GET",
            headers: {
                "Content-Type": 'application/json',
                "Authorization": `Organisation ${process.env.LESSONSPACE_API_KEY}`
            }
        })

        const text = await response.text();
        if(!response.ok){
            console.log("response not ok: " + text);
            return NextResponse.json({
                status: 500
            })
        }
        console.log("response ok");
        
        const response_json = await response.json();
        console.log("Lesson space response: " + response_json);

        return response_json;
    }catch(err){
        return NextResponse.json({
            status: 500
        })
        
    }

    
}

export async function POST(req: NextRequest) {
  console.log("Inside Lessonspace POST");

  const supabase = await createClient();
  const URL = "https://api.thelessonspace.com/v2/spaces/launch/";

  try {
    const { student_id } = await req.json();

    if (!student_id) {
      throw new Error("Missing student_id");
    }

    const { data: student, error } = await supabase
      .from("students")
      .select("lesson_space_id, name")
      .eq("id", student_id)
      .single();

    if (error || !student) {
      return NextResponse.json({
        status: 404,
        message: "Student not found",
      });
    }

    let lesson_space_id = student.lesson_space_id;

    if (!lesson_space_id) {
      lesson_space_id = crypto.randomUUID();

      console.log("Creating new lesson space:", lesson_space_id);

      const createRes = await fetch(URL, {
        method: "POST",
        headers: {
          Authorization: `Organisation ${process.env.LESSONSPACE_API_KEY!.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: lesson_space_id,
          transcribe: true,
          summarize: true,
          record_av: true,
          user: {
            id: student.name,
            role: "participant",
            custom_jwt_parameters: {
              meta: {
                displayName: student.name,
                lessonTitle: `${student.name} Public Speaking Room!`,
              },
            },
          },
        }),
      });

      const createJson = await createRes.json();

      if (!createRes.ok) {
        console.error(createJson);
        return NextResponse.json({
          status: 500,
          message: "Lessonspace create failed",
        });
      }

      // Save ID
      await supabase
        .from("students")
        .update({ lesson_space_id })
        .eq("id", student_id);
    }

    console.log("Launching lesson space:", lesson_space_id);

    const launchRes = await fetch(URL, {
      method: "POST",
      headers: {
        Authorization: `Organisation ${process.env.LESSONSPACE_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: lesson_space_id,
        user: {
          id: student.name,
          role: "participant",
          custom_jwt_parameters: {
            meta: {
              displayName: student.name,
            },
          },
        },
      }),
    });

    const launchJson = await launchRes.json();

    if (!launchRes.ok) {
      console.error(launchJson);
      return NextResponse.json({
        status: 500,
        message: "Launch failed",
      });
    }

    return NextResponse.json({
      status: 200,
      url: launchJson.url,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({
      status: 500,
      message: "Server error",
    });
  }
}