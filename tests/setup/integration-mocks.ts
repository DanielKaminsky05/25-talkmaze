/**
 * Global mocks for Next.js server-only APIs that throw outside a request scope.
 *
 * Included in vitest.integration.config.ts setupFiles. vi.mock calls here are
 * hoisted before any imports in every integration test file, so route handlers
 * can be called directly without a real Next.js server.
 *
 * Cookie state is driven by tests/helpers/request.ts which sets
 * nextCookies.header before each handler call.
 */
import { nextCookies, parseCookieHeader } from "@tests/helpers/nextHeadersMock";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => {
    const pairs = parseCookieHeader(nextCookies.header);
    return {
      get: (name: string) => pairs.find((p) => p.name === name),
      getAll: () => pairs,
      set: vi.fn(),
      has: (name: string) => pairs.some((p) => p.name === name),
      delete: vi.fn(),
    };
  }),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
