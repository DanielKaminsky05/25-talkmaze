import { createClient } from "@/src/services/supabase/server";

const LAUNCH_URL = "https://api.thelessonspace.com/v2/spaces/launch/";

export async function createRoomParticipant(
  fullName: string,
  lesson_space_id: string,
  student_id: string,
  start: boolean,
) {
  const supabase = await createClient();
  const lesson_space_webhook_url = process.env.LESSONSPACE_WEBHOOK_URL;

  if (!lesson_space_webhook_url) {
    throw new Error("LESSONSPACE_WEBHOOK_URL is not set");
  }

  const baseBody = {
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
  };

  const body = start
    ? {
        ...baseBody,
        webhooks: {
          session: { start: lesson_space_webhook_url },
          transcription: { finish: lesson_space_webhook_url },
          summary: { finish: lesson_space_webhook_url },
        },
      }
    : baseBody;

  const createRes = await fetch(LAUNCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Organisation ${process.env.LESSONSPACE_API_KEY!.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const createJson = await createRes.json();

  if (!createRes.ok) {
    console.error(createJson);
    throw new Error("LessonSpace API error: " + JSON.stringify(createJson));
  }

  await supabase
    .from("students")
    .update({
      lesson_space_student_link: createJson.client_url,
      webhook_room_id: createJson.room_id,
    })
    .eq("id", student_id);

  return createJson as { client_url: string; room_id: string };
}
