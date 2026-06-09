"use client";

import { useEffect, useState } from "react";
import {
  getSecondaryTimeZones,
  normalizeTimeZone,
  PRIMARY_TIME_ZONES,
} from "@/src/lib/scheduling/timezones";
import { Field, FieldError, FieldLabel } from "@/src/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

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
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor="timezone-select">{label}</FieldLabel>
      <Select
        value={normalizedValue || undefined}
        onValueChange={(next) => onChange(normalizeTimeZone(next) ?? "")}
      >
        <SelectTrigger id="timezone-select" size="lg" error={!!error}>
          <SelectValue placeholder="Select time zone" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Canada and North America</SelectLabel>
            {PRIMARY_TIME_ZONES.map((timeZone) => (
              <SelectItem key={timeZone} value={timeZone}>
                {timeZone}
              </SelectItem>
            ))}
          </SelectGroup>
          {needsSelectedOption && (
            <SelectGroup>
              <SelectLabel>Selected</SelectLabel>
              <SelectItem value={normalizedValue}>
                {normalizedValue}
              </SelectItem>
            </SelectGroup>
          )}
          {secondaryTimeZones.length > 0 && (
            <SelectGroup>
              <SelectLabel>Other time zones</SelectLabel>
              {secondaryTimeZones.map((timeZone) => (
                <SelectItem key={timeZone} value={timeZone}>
                  {timeZone}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
