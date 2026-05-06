const LAUNCH_URL = "https://api.thelessonspace.com/v2/spaces/launch/";

export type LessonSpaceLaunchResult = {
  client_url: string;
  room_id: string;
};

type StudentLaunchOptions = {
  fullName: string;
  lessonSpaceId: string;
  includeWebhooks: boolean;
  webhookUrl?: string;
};

type TeacherLaunchOptions = {
  lessonSpaceId: string;
  studentFullName: string;
  coachId: string;
  coachFullName: string;
};

/**
 * Sends a launch request to LessonSpace and returns the launch payload.
 *
 * @param body Provider-specific launch request payload.
 * @returns The LessonSpace launch response containing a client URL and room ID.
 */
async function launchRoom(body: object): Promise<LessonSpaceLaunchResult> {
  const apiKey = process.env.LESSONSPACE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("LESSONSPACE_API_KEY is not set");
  }

  const response = await fetch(LAUNCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Organisation ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error("LessonSpace API error: " + JSON.stringify(json));
  }

  return json as LessonSpaceLaunchResult;
}

/**
 * Launches (or refreshes) a student participant link for an existing 
 * LessonSpace room.
 *
 * @param options Student launch options (identity, room id, webhook behavior).
 * @returns The LessonSpace launch response containing a client URL and room ID.
 */
export async function launchStudentParticipantRoom({
  fullName,
  lessonSpaceId,
  includeWebhooks,
  webhookUrl,
}: StudentLaunchOptions): Promise<LessonSpaceLaunchResult> {
  if (includeWebhooks && !webhookUrl) {
    throw new Error("Webhook URL is required when includeWebhooks is true");
  }

  const baseBody = {
    id: lessonSpaceId,
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

  const body = includeWebhooks
    ? {
        ...baseBody,
        webhooks: {
          session: { start: webhookUrl },
          transcription: { finish: webhookUrl },
          summary: { finish: webhookUrl },
        },
      }
    : baseBody;

  return launchRoom(body);
}

/**
 * Launches (or refreshes) a teacher participant link for an existing 
 * LessonSpace room.
 *
 * @param options Teacher launch options (room id and coach/student display metadata).
 * @returns The LessonSpace launch response containing a client URL and room ID.
 */
export async function launchTeacherParticipantRoom({
  lessonSpaceId,
  studentFullName,
  coachId,
  coachFullName,
}: TeacherLaunchOptions): Promise<LessonSpaceLaunchResult> {
  return launchRoom({
    id: lessonSpaceId,
    name: studentFullName,
    transcribe: true,
    summarise: true,
    record_av: true,
    user: {
      id: coachId,
      role: "teacher",
      leader: true,
      custom_jwt_parameters: {
        meta: {
          displayName: `Coach ${coachFullName}`,
          lessonTitle: `${studentFullName} Public Speaking Room!`,
        },
      },
    },
  });
}
