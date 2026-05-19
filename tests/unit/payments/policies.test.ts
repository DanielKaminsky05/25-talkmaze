import { describe, it, expect } from "vitest";
import {
  isWithinRefundWindow,
  REFUND_WINDOW_DAYS,
} from "@/src/lib/payments/server/policies";

// server-only is a Next.js guard that throws in non-RSC environments.
// Mock it so the module loads in Vitest's Node environment.
vi.mock("server-only", () => ({}));

const DAY_MS = 24 * 60 * 60 * 1000;

describe("isWithinRefundWindow", () => {
  const periodStart = "2026-01-01T00:00:00.000Z";
  const periodStartMs = new Date(periodStart).getTime();

  it("returns true on the same day as period start (0 days elapsed)", () => {
    const nowMs = periodStartMs;
    expect(isWithinRefundWindow(periodStart, nowMs)).toBe(true);
  });

  it("returns true well within the window (7 days)", () => {
    const nowMs = periodStartMs + 7 * DAY_MS;
    expect(isWithinRefundWindow(periodStart, nowMs)).toBe(true);
  });

  it("returns true at exactly 28 days (boundary is inclusive)", () => {
    const nowMs = periodStartMs + REFUND_WINDOW_DAYS * DAY_MS;
    expect(isWithinRefundWindow(periodStart, nowMs)).toBe(true);
  });

  it("returns false at 28 days + 1 millisecond (just past the boundary)", () => {
    const nowMs = periodStartMs + REFUND_WINDOW_DAYS * DAY_MS + 1;
    expect(isWithinRefundWindow(periodStart, nowMs)).toBe(false);
  });

  it("returns false when 29 days have elapsed", () => {
    const nowMs = periodStartMs + 29 * DAY_MS;
    expect(isWithinRefundWindow(periodStart, nowMs)).toBe(false);
  });

  it("returns false when 60 days have elapsed", () => {
    const nowMs = periodStartMs + 60 * DAY_MS;
    expect(isWithinRefundWindow(periodStart, nowMs)).toBe(false);
  });

  it("returns true when period start is in the future (0 days elapsed)", () => {
    // A future-dated period start means 0 ms have elapsed — still eligible.
    const futurePeriodStart = new Date(periodStartMs + 10 * DAY_MS).toISOString();
    const nowMs = periodStartMs;
    expect(isWithinRefundWindow(futurePeriodStart, nowMs)).toBe(true);
  });

  it("returns false for an invalid date string", () => {
    expect(isWithinRefundWindow("not-a-date")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isWithinRefundWindow("")).toBe(false);
  });

  it("REFUND_WINDOW_DAYS is 28", () => {
    // Pin the constant so a refactor that changes the policy value fails loudly.
    expect(REFUND_WINDOW_DAYS).toBe(28);
  });
});
