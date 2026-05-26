import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TIME_ZONE,
  detectBrowserTimeZone,
  getSecondaryTimeZones,
  isValidTimeZone,
  normalizeTimeZone,
} from "@/src/lib/scheduling/timezones";

describe("scheduling timezone helpers", () => {
  it("detects the browser timezone when it is valid", () => {
    mockBrowserTimeZone("America/Vancouver");

    expect(detectBrowserTimeZone()).toBe("America/Vancouver");
  });

  it("falls back to the default timezone when browser detection fails", () => {
    const actualDateTimeFormat = Intl.DateTimeFormat;
    function dateTimeFormatMock(...args: DateTimeFormatArgs) {
      if (args.length === 0) throw new Error("browser timezone unavailable");
      return actualDateTimeFormat(...args);
    }

    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      dateTimeFormatMock as typeof Intl.DateTimeFormat,
    );

    expect(detectBrowserTimeZone()).toBe(DEFAULT_TIME_ZONE);
  });

  it("accepts Canadian and global IANA timezones", () => {
    expect(isValidTimeZone("America/Regina")).toBe(true);
    expect(isValidTimeZone("America/Vancouver")).toBe(true);
    expect(isValidTimeZone("Europe/London")).toBe(true);
  });

  it("rejects invalid timezone names", () => {
    expect(isValidTimeZone("Mars/Base")).toBe(false);
  });

  it("normalizes valid timezone aliases", () => {
    expect(normalizeTimeZone("Canada/Eastern")).toBe("America/Toronto");
  });

  it("includes global IANA options outside the primary Canada-first list", () => {
    expect(getSecondaryTimeZones()).toContain("Europe/London");
  });
});

type DateTimeFormatArgs = [
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
];

function mockBrowserTimeZone(timeZone: string) {
  const actualDateTimeFormat = Intl.DateTimeFormat;
  function dateTimeFormatMock(...args: DateTimeFormatArgs) {
    if (args.length === 0) {
      return {
        resolvedOptions: () => ({ timeZone }),
      } as Intl.DateTimeFormat;
    }

    return actualDateTimeFormat(...args);
  }

  vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
    dateTimeFormatMock as typeof Intl.DateTimeFormat,
  );
}
