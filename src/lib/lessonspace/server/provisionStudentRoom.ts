import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/services/supabase/types/database";
import { createAndPersistStudentParticipantLink } from "./participants";

type ProvisionResult =
  | { provisioned: true; lessonSpaceId: string; clientUrl: string }
  | { provisioned: false; reason: "already_exists" }
  | { provisioned: false; reason: "student_not_found" };

/**
 * Provision a LessonSpace room for a student if one doesn't already exist.
 *
 * Called by the Stripe webhook's `invoice.paid` handler on first payment.
 * Takes the caller's supabase client (typically the service-role client from
 * the webhook context) so it doesn't need to re-resolve cookies / sessions.
 *
 * Behaviour:
 *   - Student missing → returns `{ provisioned: false, reason: "student_not_found" }`.
 *   - Student already has a `lesson_space_id` → returns `{ provisioned: false, reason: "already_exists" }`.
 *   - Otherwise generates a new room id, persists it, calls the LessonSpace
 *     provider to mint the launch link with webhooks enabled, persists that
 *     link too, and returns `{ provisioned: true, ... }`.
 *
 * Replaces the old /api/webhooks/stripe/learningSpace HTTP-self-hop. That
 * route was public, unauthenticated, and accepted an arbitrary `student_id`
 * — a public mutation endpoint that the contract audit flagged as the last
 * security gap.
 */
export async function provisionStudentRoom(
  supabase: SupabaseClient<Database>,
  studentId: string,
): Promise<ProvisionResult> {
  const { data: student, error } = await supabase
    .from("students")
    .select("id, lesson_space_id, first_name, last_name")
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `provisionStudentRoom: student lookup failed — ${error.message}`,
    );
  }
  if (!student) {
    return { provisioned: false, reason: "student_not_found" };
  }
  if (student.lesson_space_id) {
    return { provisioned: false, reason: "already_exists" };
  }

  const lessonSpaceId = crypto.randomUUID();
  const { error: updateError } = await supabase
    .from("students")
    .update({ lesson_space_id: lessonSpaceId })
    .eq("id", studentId);

  if (updateError) {
    throw new Error(
      `provisionStudentRoom: failed to persist lesson_space_id — ${updateError.message}`,
    );
  }

  const fullName =
    `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim();
  const launchResult = await createAndPersistStudentParticipantLink({
    studentId,
    lessonSpaceId,
    fullName,
    includeWebhooks: true,
  });

  return {
    provisioned: true,
    lessonSpaceId,
    clientUrl: launchResult.client_url,
  };
}
