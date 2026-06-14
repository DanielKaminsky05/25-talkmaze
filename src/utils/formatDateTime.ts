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
 * @param includeWeekday - Whether to prepend the abbreviated weekday. Defaults
 *  to `true`.
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

/**
 * Formats an ISO timestamp using the viewer's local timezone.
 * @param iso - ISO 8601 timestamp string.
 * @returns Time string, e.g. "3:05 PM"
 */
export function fmtLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formats an ISO timestamp as a short date string in local timezone.
 * @param iso - ISO 8601 timestamp string.
 * @param includeWeekday - Whether to prepend the abbreviated weekday. Defaults to `true`.
 * @returns Date string, e.g. `"Mon, Jan 5"`
 *          or `"Jan 5"` when `includeWeekday` is false.
 */
export function fmtLocalDate(iso: string, includeWeekday = true): string {
  return new Date(iso).toLocaleDateString("en-US", {
    ...(includeWeekday ? { weekday: "short" } : {}),
    month: "short",
    day: "numeric",
  });
}

/**
 * Converts an ISO timestamp to the value format required by an
 * `<input type="datetime-local">`, in the viewer's local timezone.
 * Unlike the `fmt*` formatters above (which return human-facing display
 * strings), this returns a machine-readable control value.
 * @param iso - ISO 8601 timestamp string.
 * @returns Local datetime-local value, e.g. "2026-06-12T15:05"
 */
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
