import "server-only";

import { createClient } from "@/src/services/supabase/server";

/**
 * Total unread messages for a family profile across all of its conversations.
 *
 * Delegates to the `get_profile_unread_total` RPC, which derives the caller
 * from auth.uid(), enforces that the profile belongs to them, and counts
 * messages newer than the profile's read marker that the caller did not send
 * (the only other sender is the coach).
 *
 * Returns 0 on error or when the caller does not own the profile.
 */
export async function getProfileUnreadTotal(
  profileId: string,
  profileType: "student" | "parent",
): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_profile_unread_total", {
    p_profile_id: profileId,
    p_profile_type: profileType,
  });

  if (error) {
    console.error("Error fetching unread total:", error);
    return 0;
  }

  return data ?? 0;
}
