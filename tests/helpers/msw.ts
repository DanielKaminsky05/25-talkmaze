import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// ─── Default handlers ─────────────────────────────────────────────────────────
// Intercept external provider calls at the network layer so adapter code in
// src/services/ runs unchanged while tests stay hermetic.
//
// Each handler returns the minimal happy-path shape the adapter expects.
// Override per-test with server.use(...) for specific assertions.

const handlers = [
  // ── Stripe ──────────────────────────────────────────────────────────────────
  http.all("https://api.stripe.com/*", () => {
    // Default: 200 with an empty object. Override per test.
    return HttpResponse.json({});
  }),

  // ── LessonSpace ─────────────────────────────────────────────────────────────
  // Real domain is api.thelessonspace.com (not api.lessonspace.com)
  http.post("https://api.thelessonspace.com/v2/spaces/launch/", () => {
    return HttpResponse.json({
      client_url: "https://app.thelessonspace.com/room/test-room",
      room_id: "test-room-id-123",
    });
  }),

  // ── Resend (email) ───────────────────────────────────────────────────────────
  http.post("https://api.resend.com/emails", () => {
    return HttpResponse.json({ id: "test-email-id" });
  }),
];

// Shared MSW server instance — imported and started in integration test files.
export const server = setupServer(...handlers);

/**
 * Call this in a describe block to activate MSW for that suite.
 *
 * import { useMsw } from "@tests/helpers/msw";
 * describe("my suite", () => {
 *   useMsw();
 *   ...
 * });
 */
export function useMsw() {
  // Can't use beforeAll/afterAll here at module level — call from inside
  // describe() blocks in test files.
  return {
    server,
    /** Convenience: override handlers for a single test. Resets after each. */
    use: (...handlers: Parameters<typeof server.use>) => server.use(...handlers),
  };
}
