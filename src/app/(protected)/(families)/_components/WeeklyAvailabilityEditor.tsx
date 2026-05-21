"use client";

import { TIME_ZONES, WEEKDAYS } from "@/src/lib/scheduling/types";

/** Single contiguous availability window within a day, in "HH:mm" localtime. */
export type AvailabilitySlot = { start: string; end: string };

/**
 * Keyed by weekday name (e.g. "Monday") with the value being the day's slot
 * list.
 * Absent keys mean the student is unavailable that whole day;
 */
export type WeeklyAvailabilityValue = Record<string, AvailabilitySlot[]>;

interface Props {
  value: WeeklyAvailabilityValue;
  onChange: (next: WeeklyAvailabilityValue) => void;
  timezone: string;
  /** Omit to hide the timezone picker */
  onTimezoneChange?: (next: string) => void;
  /**
   * Flat error map keyed by Zod issue paths
   */
  errors?: Record<string, string>;
}

/**
 * Controlled editor for a student's weekly availability.
 */
export default function WeeklyAvailabilityEditor({
  value,
  onChange,
  timezone,
  onTimezoneChange,
  errors,
}: Props) {
  // The four mutators below are thin wrappers that compute the next value and
  // hand it back through onChange
  const toggleDay = (day: string) => {
    const next = { ...value };
    if (next[day]) {
      delete next[day];
    } else {
      next[day] = [{ start: "", end: "" }];
    }
    onChange(next);
  };

  const addSlot = (day: string) => {
    onChange({
      ...value,
      [day]: [...(value[day] ?? []), { start: "", end: "" }],
    });
  };

  const updateSlot = (
    day: string,
    index: number,
    field: "start" | "end",
    slotValue: string,
  ) => {
    const updated = [...(value[day] ?? [])];
    updated[index] = { ...updated[index], [field]: slotValue };
    onChange({ ...value, [day]: updated });
  };

  const removeSlot = (day: string, index: number) => {
    const slots = value[day] ?? [];
    const filtered = slots.filter((_, i) => i !== index);
    const next = { ...value };
    if (filtered.length === 0) {
      delete next[day];
    } else {
      next[day] = filtered;
    }
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Timezone picker */}
      {onTimezoneChange && (
        <div className="flex flex-col gap-1">
          <label className="text-sm text-[#A8A8A8]">Time Zone</label>
          <div className="relative h-[52px]">
            <select
              value={timezone}
              onChange={(e) => onTimezoneChange(e.target.value)}
              className={`w-full h-full px-4 text-[18px] text-[#1F2E3B] border bg-white appearance-none cursor-pointer rounded-lg ${errors?.timeZone ? "border-red-500" : "border-[#1F2E3B]/20"}`}
            >
              {TIME_ZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
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
          {errors?.timeZone && (
            <p className="text-red-500 text-xs">{errors.timeZone}</p>
          )}
        </div>
      )}

      {/* Validation error display */}
      {errors?.availability && (
        <p className="text-red-500 text-sm font-medium">
          {errors.availability}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {WEEKDAYS.map((day) => {
          const enabled = !!value[day];
          const slots = value[day] ?? [];
          return (
            <div
              key={day}
              className="border border-[#1F2E3B]/10 p-4 rounded-xl"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-[#1F2E3B]">{day}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleDay(day)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#B1E7D6] transition-colors duration-200" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-5" />
                </label>
              </div>

              {enabled && (
                <div className="flex flex-col gap-2">
                  {slots.map((slot, idx) => {
                    const slotError =
                      errors?.[`availability.${day}.${idx}.end`];
                    return (
                      <div key={idx} className="flex flex-col gap-1">
                        <div className="flex gap-2 items-center">
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) =>
                              updateSlot(day, idx, "start", e.target.value)
                            }
                            className="border border-[#1F2E3B]/20 rounded px-2 py-1 text-sm"
                          />
                          <span className="text-[#1F2E3B]/50">–</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) =>
                              updateSlot(day, idx, "end", e.target.value)
                            }
                            className="border border-[#1F2E3B]/20 rounded px-2 py-1 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeSlot(day, idx)}
                            className="text-red-400 hover:text-red-600 text-sm cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                        {slotError && (
                          <p className="text-red-500 text-xs">{slotError}</p>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => addSlot(day)}
                    className="text-sm text-[#65CFAD] hover:underline mt-1 text-left cursor-pointer"
                  >
                    + Add time
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
