"use server";

import { getActiveProfile } from "@/src/lib/profiles/server/getActiveProfile";
import { getProfileUnreadTotal } from "../server/getProfileUnreadTotal";

/**
 * Server action: total unread messages for the caller's active family profile.
 *
 * Returns 0 when there is no active profile. Used by the sidebar unread badge
 * to refetch the authoritative count after a realtime ping or after navigating
 * to a conversation (which marks it read server-side).
 */
export async function getUnreadCount(): Promise<number> {
  const profile = await getActiveProfile();
  if (!profile) return 0;
  return getProfileUnreadTotal(profile.id, profile.type);
}
