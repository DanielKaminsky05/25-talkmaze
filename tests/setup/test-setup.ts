import { vi, afterEach } from "vitest";

// Pin timezone to UTC so fmtLocalTime/fmtLocalDate produce the same output
// regardless of where the tests run. Supported without restart in Node >= 20.4.
process.env.TZ = "UTC";

// Restore all mocks after each test so stubs don't leak.
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
