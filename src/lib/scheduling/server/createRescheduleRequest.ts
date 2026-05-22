import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/services/supabase/types/database";

type Result = { ok: true } | { ok: false; status: number; error: string };

/**
 * Parent submits a reschedule request for a session they own. The session
 * must (a) exist, (b) start in the future, (c) have no existing pending
 * request, and (d) have a requested window that is itself in the future and
 * positive-duration. Ownership is enforced upstream by assertOwnsStudent.
 */
export async function createRescheduleRequest(
  supabase: SupabaseClient<Database>,
  input: {
    sessionId: number;
    requestedStartTime: string;
    requestedEndTime: string;
  },
): Promise<Result> {
  const { sessionId, requestedStartTime, requestedEndTime } = input;

  const start = new Date(requestedStartTime);
  const end = new Date(requestedEndTime);
  const now = new Date();

  if (!(end.getTime() > start.getTime())) {
    return {
      ok: false,
      status: 400,
      error: "Requested end time must be after start time",
    };
  }
  if (!(start.getTime() > now.getTime())) {
    return {
      ok: false,
      status: 400,
      error: "Requested start time must be in the future",
    };
  }

  const { data: session, error: loadError } = await supabase
    .from("sessions")
    .select("id, start_time, reschedule_status")
    .eq("id", sessionId)
    .maybeSingle();

  if (loadError) {
    console.error("createRescheduleRequest load error", loadError);
    return { ok: false, status: 500, error: "Internal server error" };
  }
  if (!session) {
    return { ok: false, status: 404, error: "Session not found" };
  }
  if (
    !session.start_time ||
    new Date(session.start_time).getTime() <= now.getTime()
  ) {
    return {
      ok: false,
      status: 400,
      error: "Cannot reschedule a session that has already started",
    };
  }
  if (session.reschedule_status === "pending") {
    return {
      ok: false,
      status: 409,
      error: "A reschedule request is already pending for this session",
    };
  }

  const { error: updateError } = await supabase
    .from("sessions")
    .update({
      requested_start_time: requestedStartTime,
      requested_end_time: requestedEndTime,
      reschedule_status: "pending",
      requested_at: now.toISOString(),
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("createRescheduleRequest update error", updateError);
    return { ok: false, status: 500, error: "Internal server error" };
  }
  return { ok: true };
}
