"use client";

import { useEffect, useState } from "react";
import {
  getSecondaryTimeZones,
  normalizeTimeZone,
  PRIMARY_TIME_ZONES,
} from "@/src/lib/scheduling/timezones";

interface Props {
  value: string;
  onChange: (next: string) => void;
  error?: string;
  label?: string;
}

export default function TimeZoneSelect({
  value,
  onChange,
  error,
  label = "Time Zone",
}: Props) {
  const [secondaryTimeZones, setSecondaryTimeZones] = useState<string[]>([]);
  const normalizedValue = normalizeTimeZone(value) ?? "";
  const selectedIsPrimary = PRIMARY_TIME_ZONES.some(
    (timeZone) => timeZone === normalizedValue,
  );
  const selectedIsSecondary = secondaryTimeZones.includes(normalizedValue);
  const needsSelectedOption =
    normalizedValue && !selectedIsPrimary && !selectedIsSecondary;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSecondaryTimeZones(getSecondaryTimeZones());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-[#A8A8A8]">{label}</label>
      <div className="relative h-[52px]">
        <select
          value={normalizedValue}
          onChange={(e) => onChange(normalizeTimeZone(e.target.value) ?? "")}
          aria-invalid={!!error}
          className={`w-full h-full px-4 text-[18px] text-[#1F2E3B] border bg-white appearance-none cursor-pointer rounded-lg ${error ? "border-red-500" : "border-[#1F2E3B]/20"}`}
        >
          <option value="" disabled>
            Select time zone
          </option>
          <optgroup label="Canada and North America">
            {PRIMARY_TIME_ZONES.map((timeZone) => (
              <option key={timeZone} value={timeZone}>
                {timeZone}
              </option>
            ))}
          </optgroup>
          {needsSelectedOption && (
            <optgroup label="Selected">
              <option value={normalizedValue}>{normalizedValue}</option>
            </optgroup>
          )}
          {secondaryTimeZones.length > 0 && (
            <optgroup label="Other time zones">
              {secondaryTimeZones.map((timeZone) => (
                <option key={timeZone} value={timeZone}>
                  {timeZone}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
          <svg
            className="w-4 h-4 text-[#1F2E3B]/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
