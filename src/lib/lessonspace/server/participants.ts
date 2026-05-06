import { createClient } from "@/src/services/supabase/server";
import {
  launchStudentParticipantRoom,
  launchTeacherParticipantRoom,
  type LessonSpaceLaunchResult,
} from "@/src/services/lessonspace/rooms";

type CreateStudentLinkParams = {
  studentId: string;
  lessonSpaceId: string;
  fullName: string;
  includeWebhooks: boolean;
};

type CreateTeacherLinkParams = {
  studentId: string;
  coachId: string;
};

/**
 * Launches a student participant link in LessonSpace, then stores the generated
 * client URL/room id on the corresponding student row in Supabase.
 *
 * @param params Student identifier, room id, display name, and webhook mode.
 * @returns Provider launch payload containing `client_url` and `room_id`.
 */
export async function createAndPersistStudentParticipantLink({
  studentId,
  lessonSpaceId,
  fullName,
  includeWebhooks,
}: CreateStudentLinkParams): Promise<LessonSpaceLaunchResult> {
  const webhookUrl = includeWebhooks
    ? process.env.LESSONSPACE_WEBHOOK_URL
    : undefined;

  if (includeWebhooks && !webhookUrl) {
    throw new Error("LESSONSPACE_WEBHOOK_URL is not set");
  }

  // Provider call (adapter layer): create/launch participant link in LessonSpace.
  const launchResult = await launchStudentParticipantRoom({
    fullName,
    lessonSpaceId,
    includeWebhooks,
    webhookUrl,
  });

  // App persistence (domain layer): save launch artifacts used by the app.
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      lesson_space_student_link: launchResult.client_url,
      webhook_room_id: launchResult.room_id,
    })
    .eq("id", studentId);

  if (error) {
    throw new Error(
      "Unable to persist student LessonSpace link: " + error.message,
    );
  }

  return launchResult;
}

/**
 * Creates a teacher launch link for a student's existing LessonSpace room and
 * persists that teacher URL onto the student record.
 *
 * @param params Student and coach identifiers used to generate teacher launch.
 * @returns Provider launch payload containing `client_url` and `room_id`.
 */
export async function createAndPersistTeacherParticipantLink({
  studentId,
  coachId,
}: CreateTeacherLinkParams): Promise<LessonSpaceLaunchResult> {
  const supabase = await createClient();

  // Resolve student + room context needed for the teacher launch payload.
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .select("id, first_name, last_name, lesson_space_id")
    .eq("id", studentId)
    .single();

  if (studentError || !studentData) {
    throw new Error("Unable to fetch student for LessonSpace teacher link");
  }

  if (!studentData.lesson_space_id) {
    throw new Error("Student does not have a lessonSpace room");
  }

  const { data: coachData, error: coachError } = await supabase
    .from("coaches")
    .select("id, first_name, last_name")
    .eq("id", coachId)
    .single();

  if (coachError || !coachData) {
    throw new Error("Unable to fetch coach for LessonSpace teacher link");
  }

  const studentFullName =
    `${studentData.first_name || ""} ${studentData.last_name || ""}`.trim();
  const coachFullName =
    `${coachData.first_name || ""} ${coachData.last_name || ""}`.trim();

  // Provider call (adapter layer): create teacher participant URL.
  const launchResult = await launchTeacherParticipantRoom({
    lessonSpaceId: studentData.lesson_space_id,
    studentFullName,
    coachId: coachData.id,
    coachFullName,
  });

  const { error: updateError } = await supabase
    .from("students")
    .update({ lesson_space_teacher_link: launchResult.client_url })
    .eq("id", studentId);

  if (updateError) {
    throw new Error(
      "Unable to persist teacher LessonSpace link: " + updateError.message,
    );
  }

  return launchResult;
}

/**
 * Convenience helper for routes that identify coaches by account id.
 * It resolves account -> coach id, then delegates to the main teacher-link flow.
 *
 * @param params Student id + coach account id from route/auth context.
 * @returns Provider launch payload containing `client_url` and `room_id`.
 */
export async function createTeacherLinkForCoachAccount(params: {
  studentId: string;
  coachAccountId: string;
}): Promise<LessonSpaceLaunchResult> {
  const supabase = await createClient();

  const { data: coachData, error: coachError } = await supabase
    .from("coaches")
    .select("id")
    .eq("account_id", params.coachAccountId)
    .single();

  if (coachError || !coachData) {
    throw new Error("Unable to identify coach");
  }

  return createAndPersistTeacherParticipantLink({
    studentId: params.studentId,
    coachId: coachData.id,
  });
}
