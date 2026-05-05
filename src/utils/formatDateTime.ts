/**
 * Formats a UTC ISO timestamp as a 12-hour time string.
 * @param iso - UTC ISO 8601 timestamp string.
 * @returns Time string, e.g. "3:05 PM"
 */
export function fmtUtcTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m} ${period}`;
}

/**
 * Formats a UTC ISO timestamp as a short date string.
 * @param iso - UTC ISO 8601 timestamp string.
 * @param includeWeekday - Whether to prepend the abbreviated weekday. Defaults to `true`.
 * @returns Date string, e.g. `"Mon, Jan 5"`
 *          or `"Jan 5"` when `includeWeekday` is false.
 */
export function fmtUtcDate(iso: string, includeWeekday = true): string {
  return new Date(iso).toLocaleDateString("en-US", {
    ...(includeWeekday ? { weekday: "short" } : {}),
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
