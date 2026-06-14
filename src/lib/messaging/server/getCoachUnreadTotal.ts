import "server-only";

import { createClient } from "@/src/services/supabase/server";

/**
 * Total unread messages for the calling coach across all of their 
 * conversations.
 *
 * Delegates to the `get_coach_unread_total` RPC, which derives the coach from
 * auth.uid() and counts messages newer than the coach's read marker that the
 * coach did not send (the only other sender is the family profile). No args,
 * the coach has a single identity.
 *
 * Returns 0 on error or when the caller is not a coach.
 */
export async function getCoachUnreadTotal(): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_coach_unread_total");

  if (error) {
    console.error("Error fetching coach unread total:", error);
    return 0;
  }

  return data ?? 0;
}
