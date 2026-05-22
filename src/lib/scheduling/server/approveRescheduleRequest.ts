import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/services/supabase/types/database";

type Result = { ok: true } | { ok: false; status: number; error: string };

/**
 * Coach approves the parent's pending reschedule request. Copies the requested
 * window into start_time/end_time and clears the four request columns.
 *
 * TODO(atomicity): the conflict re-check + UPDATE here are two statements, not
 * atomic. Matches existing posture (docs/repo-quality-audit.md "Data
 * integrity"). The canonical fix is a Postgres RPC. Low probability of race
 * in practice (single coach, manual click).
 */
export async function approveRescheduleRequest(
  supabase: SupabaseClient<Database>,
  sessionId: number,
): Promise<Result> {
  const { data: session, error: loadError } = await supabase
    .from("sessions")
    .select(
      "id, coach_id, reschedule_status, requested_start_time, requested_end_time",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (loadError) {
    console.error("approveRescheduleRequest load error", loadError);
    return { ok: false, status: 500, error: "Internal server error" };
  }
  if (!session) {
    return { ok: false, status: 404, error: "Session not found" };
  }
  if (session.reschedule_status !== "pending") {
    return {
      ok: false,
      status: 409,
      error: "No pending reschedule request to approve",
    };
  }
  if (
    !session.requested_start_time ||
    !session.requested_end_time ||
    !session.coach_id
  ) {
    // The DB CHECK constraint should make this impossible, but TS narrowing
    // still demands the guard.
    console.error("approveRescheduleRequest invariant", { sessionId });
    return { ok: false, status: 500, error: "Internal server error" };
  }

  const requestedStart = session.requested_start_time;
  const requestedEnd = session.requested_end_time;

  if (new Date(requestedStart).getTime() <= Date.now()) {
    return {
      ok: false,
      status: 400,
      error: "Requested start time is no longer in the future",
    };
  }

  // Conflict re-check: any other session for this coach overlapping the
  // requested window. Two intervals overlap iff start1 < end2 AND start2 < end1.
  const { data: conflicts, error: conflictError } = await supabase
    .from("sessions")
    .select("id")
    .eq("coach_id", session.coach_id)
    .neq("id", sessionId)
    .lt("start_time", requestedEnd)
    .gt("end_time", requestedStart)
    .limit(1);

  if (conflictError) {
    console.error("approveRescheduleRequest conflict error", conflictError);
    return { ok: false, status: 500, error: "Internal server error" };
  }
  if (conflicts && conflicts.length > 0) {
    return {
      ok: false,
      status: 409,
      error: "Requested time conflicts with another session on your calendar",
    };
  }

  const { error: updateError } = await supabase
    .from("sessions")
    .update({
      start_time: requestedStart,
      end_time: requestedEnd,
      requested_start_time: null,
      requested_end_time: null,
      reschedule_status: null,
      requested_at: null,
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("approveRescheduleRequest update error", updateError);
    return { ok: false, status: 500, error: "Internal server error" };
  }
  return { ok: true };
}
