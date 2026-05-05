/**
 * Combines first and last name into a single trimmed string.
 * @param first - First name, may be null or undefined.
 * @param last - Last name, may be null or undefined.
 * @param fallback - Returned when both names are empty. Defaults to "".
 * @returns Trimmed full name, or `fallback` if the result would be empty.
 */
export function fullName(
  first: string | null | undefined,
  last: string | null | undefined,
  fallback = "",
): string {
  return `${first ?? ""} ${last ?? ""}`.trim() || fallback;
}
