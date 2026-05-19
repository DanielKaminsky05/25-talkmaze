import { vi, afterEach } from "vitest";

// Restore all mocks after each test so stubs don't leak.
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
