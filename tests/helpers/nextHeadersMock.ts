/**
 * Shared cookie state for the next/headers mock used in integration tests.
 *
 * Before calling any route handler that reads cookies(), set the cookie header:
 *   nextCookies.header = cookieString
 *
 * This is done automatically by tests/helpers/request.ts.
 * Do not import this from production code.
 */
export const nextCookies = { header: "" };

export function parseCookieHeader(header: string) {
  if (!header) return [];
  return header
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf("=");
      if (i === -1) return { name: s, value: "" };
      return {
        name: s.slice(0, i).trim(),
        value: decodeURIComponent(s.slice(i + 1).trim()),
      };
    })
    .filter((p) => p.name);
}
