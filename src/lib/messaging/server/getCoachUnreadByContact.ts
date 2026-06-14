import "server-only";

import { createClient } from "@/src/services/supabase/server";

/**
 * Per-contact unread message counts for the calling coach.
 *
 * Delegates to the `get_coach_unread_by_contact` RPC, which derives the coach
 * from auth.uid() and counts messages newer than the coach's read marker that
 * the coach did not send, grouped by the family profile id.
 *
 * The keys are family profile ids(`Contact.id` in the coach UI); only contacts
 * with at least one unread message are present. Returns `{}` on error or when
 * the caller is not a coach.
 */
export async function getCoachUnreadByContact(): Promise<
  Record<string, number>
> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_coach_unread_by_contact");

  if (error) {
    console.error("Error fetching coach unread by contact:", error);
    return {};
  }

  return Object.fromEntries(
    (data ?? []).map((row) => [row.contact_id, row.unread_count]),
  );
}
