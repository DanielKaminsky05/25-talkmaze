"use server";

import { getActiveProfile } from "@/src/lib/profiles/server/getActiveProfile";
import { getProfileUnreadTotal } from "../server/getProfileUnreadTotal";
import { getProfileUnreadByContact } from "../server/getProfileUnreadByContact";

export type UnreadState = {
  /** Total unread messages across all of the viewer's conversations */
  total: number;
  /**
   * Per-contact unread counts, keyed by `Contact.id` (the coach account id for
   * the family view; the family profile id for the coach view).
   */
  byContact: Record<string, number>;
};

/**
 * Server action: the active family profile's unread state in one round trip.
 *
 * Resolves the profile once, then fetches the authoritative total and the
 * per-contact breakdown together so the sidebar badge and the unread-contacts
 * list stay in sync. Returns zeros when there is no active profile.
 *
 * Used by `UnreadMessagesContext` to refetch after a realtime ping or after navigating
 * to a conversation (which marks it read server-side).
 */
export async function getUnreadState(): Promise<UnreadState> {
  const profile = await getActiveProfile();
  if (!profile) return { total: 0, byContact: {} };

  const [total, byContact] = await Promise.all([
    getProfileUnreadTotal(profile.id, profile.type),
    getProfileUnreadByContact(profile.id, profile.type),
  ]);

  return { total, byContact };
}
