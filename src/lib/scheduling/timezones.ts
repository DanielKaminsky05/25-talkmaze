export const DEFAULT_TIME_ZONE = "America/Toronto";

export const PRIMARY_TIME_ZONES = [
  "America/St_Johns",
  "America/Halifax",
  "America/Glace_Bay",
  "America/Moncton",
  "America/Goose_Bay",
  "America/Blanc-Sablon",
  "America/Toronto",
  "America/Iqaluit",
  "America/Coral_Harbour",
  "America/Winnipeg",
  "America/Rankin_Inlet",
  "America/Resolute",
  "America/Regina",
  "America/Swift_Current",
  "America/Edmonton",
  "America/Cambridge_Bay",
  "America/Inuvik",
  "America/Creston",
  "America/Dawson_Creek",
  "America/Fort_Nelson",
  "America/Vancouver",
  "America/Whitehorse",
  "America/Dawson",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

const EXTRA_TIME_ZONES = ["UTC"] as const;

export function normalizeTimeZone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: trimmed,
    }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

export function isValidTimeZone(value: unknown): value is string {
  return normalizeTimeZone(value) !== null;
}

export function detectBrowserTimeZone(): string {
  try {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return normalizeTimeZone(browserTimeZone) ?? DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export function getTimeZones(): string[] {
  return uniqueTimeZones([
    ...PRIMARY_TIME_ZONES,
    ...EXTRA_TIME_ZONES,
    ...getRuntimeTimeZones(),
  ]);
}

export function getSecondaryTimeZones(): string[] {
  const primary = new Set(uniqueTimeZones(PRIMARY_TIME_ZONES));
  return getTimeZones().filter((timeZone) => !primary.has(timeZone));
}

function getRuntimeTimeZones(): string[] {
  try {
    const supportedValuesOf = (
      Intl as unknown as {
        supportedValuesOf?: (key: "timeZone") => string[];
      }
    ).supportedValuesOf;

    if (typeof supportedValuesOf !== "function") return [];
    return supportedValuesOf("timeZone");
  } catch {
    return [];
  }
}

function uniqueTimeZones(values: readonly string[]) {
  const seen = new Set<string>();
  const timeZones: string[] = [];

  values.forEach((value) => {
    const normalized = normalizeTimeZone(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    timeZones.push(normalized);
  });

  return timeZones;
}
