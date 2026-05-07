import "server-only";

export const REFUND_WINDOW_DAYS = 28;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Checks whether a subscription is still within the refund window.
 *
 * @param currentPeriodStart ISO timestamp of the current billing period start.
 * @param nowMs Optional current time override in milliseconds (for tests).
 * @returns `true` when the current time is within `REFUND_WINDOW_DAYS` 
 *           from period start.
 */
export function isWithinRefundWindow(
  currentPeriodStart: string,
  nowMs: number = Date.now(),
): boolean {
  const periodStartMs = new Date(currentPeriodStart).getTime();
  if (!Number.isFinite(periodStartMs)) {
    return false;
  }
  return nowMs - periodStartMs <= REFUND_WINDOW_DAYS * DAY_MS;
}
