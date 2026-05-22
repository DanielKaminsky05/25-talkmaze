import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/services/supabase/types/database";

type Result = { ok: true } | { ok: false; status: number; error: string };

/**
 * Parent withdraws their pending reschedule request. No-ops are surfaced as
 * 409 so the UI knows the row is no longer in the expected state (most
 * likely: the coach has already approved/declined).
 */
export async function withdrawRescheduleRequest(
  supabase: SupabaseClient<Database>,
  sessionId: number,
): Promise<Result> {
  const { data: session, error: loadError } = await supabase
    .from("sessions")
    .select("id, reschedule_status")
    .eq("id", sessionId)
    .maybeSingle();

  if (loadError) {
    console.error("withdrawRescheduleRequest load error", loadError);
    return { ok: false, status: 500, error: "Internal server error" };
  }
  if (!session) {
    return { ok: false, status: 404, error: "Session not found" };
  }
  if (session.reschedule_status !== "pending") {
    return {
      ok: false,
      status: 409,
      error: "No pending reschedule request to withdraw",
    };
  }

  const { error: updateError } = await supabase
    .from("sessions")
    .update({
      requested_start_time: null,
      requested_end_time: null,
      reschedule_status: null,
      requested_at: null,
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("withdrawRescheduleRequest update error", updateError);
    return { ok: false, status: 500, error: "Internal server error" };
  }
  return { ok: true };
}
