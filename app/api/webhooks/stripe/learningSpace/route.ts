import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/service";

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
  console.log("Inside post request");
  console.log("Inside post lessonspace");
  const URL = "https://api.thelessonspace.com/v2/spaces/launch/";
  const supabase = await createServiceRoleClient();
  try {
    const body = await req.json();
    const student_id = body.student_id;

    //make sure student id exists
    if (!student_id) {
      throw new Error("Error identifying student");
    }
    //get the lessonspace id from supabase
    const { data, error } = await supabase
      .from("students")
      .select("lesson_space_id")
      .eq("id", student_id)
      .single();
    if (data?.lesson_space_id) {
      console.log("Already have id");
      return NextResponse.json({
        status: 200,
        message: "Student already has an unified learning space",
      });
    }
    if (error) {
      return NextResponse.json({
        status: 404,
        message: "Unable to find student lesson space id",
      });
    }

    //get the name of the user using the metadata student id
    const name = await supabase
      .from("students")
      .select("name")
      .eq("id", student_id)
      .single();
    console.log("User name: " + name.data);

    //if we cant find the name, it means we cant identify the student
    if (!name.data) {
      return NextResponse.json({
        status: 500,
        message: "Error getting student name from supabase",
      });
    }
    const name_string = name.data?.name;
    console.log("name_string being sent as id:", name_string);

    //make call to lessonspace api to create new unified lessonspace
    const response = await fetch(URL, {
      method: "POST",
      headers: {
        Authorization: `Organisation ${process.env.LESSONSPACE_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: student_id,
        transcribe: true,
        summarize: true,
        record_av: true,
      }),
    });

    //get response of fetch call
    const response_json = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        status: 500,
        message:
          "Error posting to lessonspace: " + JSON.stringify(response_json),
      });
    }
    console.log("LessonSpace HTTP status:", response.status, response.status === 201 ? "(new space created)" : "(existing space retrieved)");
    console.log("LessonSpace response_json:", JSON.stringify(response_json));

    //upon successful creation of lessonspace, update url in lessonspace id in student table
    const lesson_space_update = await supabase
      .from("students")
      .update({ lesson_space_id: response_json.client_url })
      .eq("id", student_id);

    //if we can not update, indicate these is an error updating it
    if (lesson_space_update.error) {
      console.error("Supabase update error:", JSON.stringify(lesson_space_update.error));
      throw new Error("Supabase Error: " + JSON.stringify(lesson_space_update.error));
    }

    return NextResponse.json({
      status: 200,
      message: "Successfully made lessonspace",
    });
    //post to supabase
  } catch (err) {
    //log any errors not caught above, probably a server error
    console.log(err);

    return NextResponse.json({
      status: 500,
      message: "Error making lessonspace: " + err,
    });
  }
}
