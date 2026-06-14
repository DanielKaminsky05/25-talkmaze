"use server";

import { getCurrentUser } from "@/src/lib/auth/server/getCurrentUser";
import { getCoachUnreadTotal } from "../server/getCoachUnreadTotal";
import { getCoachUnreadByContact } from "../server/getCoachUnreadByContact";
import type { UnreadState } from "./getUnreadState";

/**
 * Server action: the calling coach's unread state in one round trip.
 *
 * Fetches the authoritative total and the per-contact breakdown (keyed by
 * family profile id = `Contact.id`) together so the sidebar badge and the
 * unread-contacts list stay in sync. Returns zeros when there is no session.
 *
 * Used by the generalized `UnreadMessagesProvider` (configured for the coach inbox
 * topic) to refetch after a realtime ping or after opening a conversation.
 */
export async function getCoachUnreadState(): Promise<UnreadState> {
  const user = await getCurrentUser();
  if (!user) return { total: 0, byContact: {} };

  const [total, byContact] = await Promise.all([
    getCoachUnreadTotal(),
    getCoachUnreadByContact(),
  ]);

  return { total, byContact };
}
