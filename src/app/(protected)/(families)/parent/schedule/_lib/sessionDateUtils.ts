/**
 * Formats an ISO timestamp as a long-form date in the viewer's local timezone.
 * Long-form counterpart to the shared `fmtLocalDate` (which is short-form).
 * @param iso - ISO 8601 timestamp string.
 * @returns Date string, e.g. "Monday, January 5"
 */
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * Formats an ISO timestamp as a long-form date + time in the viewer's local 
 * timezone.
 * @param iso - ISO 8601 timestamp string.
 * @returns Date-time string, e.g. "Monday, January 5, 3:05 PM"
 */
export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Computes the duration between two ISO timestamps, in whole minutes.
 * @param startIso - Start ISO 8601 timestamp string.
 * @param endIso - End ISO 8601 timestamp string, or null when there is no end 
 *                 time.
 * @returns Rounded positive minute count, or null if `endIso` is missing or 
 *          the span is non-positive (e.g. end at or before start).
 */
export function getDurationMin(startIso: string, endIso: string | null) {
  if (!endIso) return null;
  const start = new Date(startIso);
  const end = new Date(endIso);
  const min = Math.round((end.getTime() - start.getTime()) / 60000);
  return Number.isFinite(min) && min > 0 ? min : null;
}
