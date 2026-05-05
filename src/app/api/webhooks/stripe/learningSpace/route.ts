import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/src/services/supabase/service";
import { createClient } from "@/src/services/supabase/server";
import { createRoomParticipant } from "@/src/services/lessonspace/rooms";
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

    const fullName =
      `${student.first_name || ""} ${student.last_name || ""}`.trim();
    let lesson_space_id = student.lesson_space_id;
    console.log("Dat van has : " + lesson_space_id);
    if (!lesson_space_id) {
      lesson_space_id = crypto.randomUUID();
      console.log("Creating new lesson space:", lesson_space_id);
      const createJson = await createRoomParticipant(
        fullName,
        lesson_space_id,
        student_id,
        true,
      );
      // Update student table
      const { error: updateError } = await supabase
        .from("students")
        .update({
          lesson_space_id: lesson_space_id,
        })
        .eq("id", student_id);

      if (updateError) {
        return NextResponse.json({
          status: 500,
          message: "Error updating supabase: " + updateError.message,
        });
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
