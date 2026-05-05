"use server";
import { createClient } from "@/src/services/supabase/server";
import { getActiveProfile } from "@/src/lib/profiles/server/getActiveProfile";
import { createRoomParticipant } from "@/src/services/lessonspace/rooms";

export async function getLessonSpace() {
  const supabase = await createClient();
  const profile = await getActiveProfile();
  const student_id = profile?.id;

  if (!student_id || profile.type !== "student") {
    throw new Error("Unable to identify student");
  }

  const { data: nameData, error: nameDataError } = await supabase
    .from("students")
    .select("first_name,last_name,lesson_space_id")
    .eq("id", student_id)
    .single();

  if (!nameData || nameDataError) {
    throw new Error("Unable to find student");
  }

  if (!nameData.lesson_space_id) {
    throw new Error("Unable to find room");
  }

  const fullName =
    `${nameData.first_name || ""} ${nameData.last_name || ""}`.trim();
  const data = await createRoomParticipant(
    fullName,
    nameData.lesson_space_id,
    student_id,
    false,
  );

  console.log("Returning student link: " + data.client_url);
  return data.client_url;
}
