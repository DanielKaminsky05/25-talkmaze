export const TIME_ZONES = [
  "America/St_Johns",
  "America/Halifax",
  "America/Toronto",
  "America/New_York",
  "America/Chicago",
  "America/Winnipeg",
  "America/Denver",
  "America/Edmonton",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

export type OnboardingTimeZone = (typeof TIME_ZONES)[number];
