"use server";

import { getPendingRescheduleCount } from "../server/getPendingRescheduleCount";

export type RescheduleState = {
  /** Pending reschedule requests addressed to the current coach. */
  pending: number;
};

/**
 * Server action: the current coach's pending reschedule count in one round
 * trip. Used by `RescheduleContext` to refetch the sidebar badge after the
 * coach navigates (e.g. approving/declining a request) and as the seam where a
 * realtime refresh can hook in later.
 */
export async function getPendingRescheduleState(): Promise<RescheduleState> {
  const pending = await getPendingRescheduleCount();
  return { pending };
}
