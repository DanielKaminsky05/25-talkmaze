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
<<<<<<< HEAD
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
=======
    console.log("response ok");
>>>>>>> origin/dev-merge-payment-page

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
<<<<<<< HEAD
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
=======
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

    const lesson_space_id = crypto.randomUUID();
    //make call to lessonspace api to create new unified lessonspace
    const response = await fetch(URL, {
>>>>>>> origin/dev-merge-payment-page
      method: "POST",
      headers: {
        Authorization: `Organisation ${process.env.LESSONSPACE_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
<<<<<<< HEAD
      body: JSON.stringify({
        id: lesson_space_id,
        user: {
          id: student.name,
          role: "participant",
          custom_jwt_parameters: {
            meta: {
              displayName: student.name,
=======
      //all params are intuitive except leader which is simply an extra
      //feature the coach can access when teaching
      //it lets the coach be able to set permissions for their students
      body: JSON.stringify({
        id: lesson_space_id,
        transcribe: true,
        summarize: true,
        record_av: true,
        user: {
          id: name_string,
          role: "participant",
          custom_jwt_parameters: {
            meta: {
              displayName: name_string,
              lessonTitle: `${name_string} Public Speaking Room!`,
>>>>>>> origin/dev-merge-payment-page
            },
          },
        },
      }),
    });

<<<<<<< HEAD
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
=======
    //get response of fetch call
    const response_json = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        status: 500,
        message:
          "Error posting to lessonspace: " + JSON.stringify(response_json),
      });
    }

    console.log("LessonSpace response_json:", JSON.stringify(response_json));

    //upon successful creation of lessonspace, update both the lesson_space_id
    //and student link in student table
    const lesson_space_update = await supabase
      .from("students")
      .update({
        lesson_space_id: lesson_space_id,
        lesson_space_student_link: response_json.client_url,
      })
      .eq("id", student_id);

    //if we can not update, indicate these is an error updating it
    if (lesson_space_update.error) {
      throw new Error("Supabase Error: " + error);
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
>>>>>>> origin/dev-merge-payment-page
