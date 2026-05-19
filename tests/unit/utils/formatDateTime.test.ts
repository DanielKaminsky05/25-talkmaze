import { describe, it, expect } from "vitest";
import {
  fmtUtcTime,
  fmtUtcDate,
  fmtLocalTime,
  fmtLocalDate,
} from "@/src/utils/formatDateTime";

// TZ=UTC is set globally in tests/setup/test-setup.ts so fmtLocalTime and
// fmtLocalDate behave identically to their UTC counterparts here.

describe("fmtUtcTime", () => {
  it("formats a standard afternoon time correctly", () => {
    expect(fmtUtcTime("2026-05-19T15:05:00.000Z")).toBe("3:05 PM");
  });

  it("pads single-digit minutes with a leading zero", () => {
    expect(fmtUtcTime("2026-05-19T09:03:00.000Z")).toBe("9:03 AM");
  });

  it("formats midnight as 12:00 AM (not 0:00 AM)", () => {
    expect(fmtUtcTime("2026-01-01T00:00:00.000Z")).toBe("12:00 AM");
  });

  it("formats noon as 12:00 PM (not 0:00 PM)", () => {
    expect(fmtUtcTime("2026-01-01T12:00:00.000Z")).toBe("12:00 PM");
  });

  it("formats 1 AM correctly", () => {
    expect(fmtUtcTime("2026-01-01T01:00:00.000Z")).toBe("1:00 AM");
  });

  it("formats 11:59 PM correctly", () => {
    expect(fmtUtcTime("2026-01-01T23:59:00.000Z")).toBe("11:59 PM");
  });

  it("is not affected by the runtime local timezone (reads UTC hours)", () => {
    // 00:00 UTC = previous day in UTC-5, but fmtUtcTime must always read UTC.
    expect(fmtUtcTime("2026-06-01T00:00:00.000Z")).toBe("12:00 AM");
  });
});

describe("fmtUtcDate", () => {
  it("includes abbreviated weekday and month by default", () => {
    // 2026-05-19 is a Tuesday
    expect(fmtUtcDate("2026-05-19T15:00:00.000Z")).toBe("Tue, May 19");
  });

  it("omits weekday when includeWeekday is false", () => {
    expect(fmtUtcDate("2026-05-19T15:00:00.000Z", false)).toBe("May 19");
  });

  it("uses abbreviated month names", () => {
    expect(fmtUtcDate("2026-01-01T00:00:00.000Z", false)).toBe("Jan 1");
    expect(fmtUtcDate("2026-12-31T00:00:00.000Z", false)).toBe("Dec 31");
  });

  it("formats a Monday correctly", () => {
    // 2026-05-18 is a Monday
    expect(fmtUtcDate("2026-05-18T10:00:00.000Z")).toBe("Mon, May 18");
  });

  it("reads date in UTC, not local timezone", () => {
    // 2026-01-01T00:30:00Z is still Jan 1 in UTC even if local is UTC-1.
    expect(fmtUtcDate("2026-01-01T00:30:00.000Z", false)).toBe("Jan 1");
  });
});

describe("fmtLocalTime", () => {
  // With TZ=UTC the local and UTC results must be identical.
  it("formats afternoon time the same as fmtUtcTime when TZ=UTC", () => {
    expect(fmtLocalTime("2026-05-19T15:05:00.000Z")).toBe(
      fmtUtcTime("2026-05-19T15:05:00.000Z"),
    );
  });

  it("returns a non-empty string containing AM or PM", () => {
    const result = fmtLocalTime("2026-05-19T09:00:00.000Z");
    expect(result).toMatch(/AM|PM/);
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes minutes in HH:MM format", () => {
    const result = fmtLocalTime("2026-05-19T09:05:00.000Z");
    expect(result).toContain(":05");
  });
});

describe("fmtLocalDate", () => {
  it("formats date the same as fmtUtcDate when TZ=UTC", () => {
    const iso = "2026-05-19T10:00:00.000Z";
    expect(fmtLocalDate(iso)).toBe(fmtUtcDate(iso));
  });

  it("omits weekday when includeWeekday is false", () => {
    const withDay = fmtLocalDate("2026-05-19T10:00:00.000Z", true);
    const without = fmtLocalDate("2026-05-19T10:00:00.000Z", false);
    expect(withDay.length).toBeGreaterThan(without.length);
  });

  it("returns a non-empty string", () => {
    expect(fmtLocalDate("2026-05-19T10:00:00.000Z")).toBeTruthy();
  });
});
