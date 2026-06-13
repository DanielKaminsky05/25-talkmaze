import "server-only";

import { createClient } from "@/src/services/supabase/server";

/**
 * Per-contact unread message counts for a family profile.
 *
 * Delegates to the `get_profile_unread_by_contact` RPC, which derives the caller
 * from auth.uid(), enforces that the profile belongs to them, and counts
 * messages newer than the profile's read marker that the caller did not send
 * (the only other sender is the coach), grouped by the coach's account id.
 *
 * The keys are coach account ids (`Contact.id`); only contacts with at least one
 * unread message are present. Returns `{}` on error or when the caller does not
 * own the profile.
 */
export async function getProfileUnreadByContact(
  profileId: string,
  profileType: "student" | "parent",
): Promise<Record<string, number>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_profile_unread_by_contact", {
    p_profile_id: profileId,
    p_profile_type: profileType,
  });

  if (error) {
    console.error("Error fetching unread by contact:", error);
    return {};
  }

  return Object.fromEntries(
    (data ?? []).map((row) => [row.contact_id, row.unread_count]),
  );
}
