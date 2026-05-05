"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { completeStudentSetup } from "../actions";
import {
  OnboardingTimeZone,
  TIME_ZONES,
} from "@/src/app/(protected)/(families)/onboarding/types";

interface Props {
  studentId: string;
  firstName: string;
  lastName: string;
}

type Slot = { start: string; end: string };

const setupSchema = z.object({
  grade: z.number().min(1, "Please select a grade"),
  timeZone: z.string().min(1, "Time zone is required"),
  availability: z
    .record(
      z.string(),
      z.array(
        z
          .object({
            start: z.string().min(1, "Start time required"),
            end: z.string().min(1, "End time required"),
          })
          .refine((data) => !data.start || !data.end || data.end > data.start, {
            message: "End time must be after start time",
            path: ["end"],
          }),
      ),
    )
    .refine(
      (val) => {
        const entries = Object.entries(val);
        if (entries.length === 0) return false;
        return entries.every(([, slots]) =>
          slots.some((s) => s.start && s.end),
        );
      },
      { message: "Please ensure all selected days have valid time slots" },
    ),
});

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function StudentSetupForm({
  studentId,
  firstName,
  lastName,
}: Props) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [grade, setGrade] = useState<number>(1);
  const [timeZone, setTimeZone] =
    useState<OnboardingTimeZone>("America/Toronto");
  const [notes, setNotes] = useState("");
  const [weeklyAvailability, setWeeklyAvailability] = useState<
    Record<string, Slot[]>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDay = (day: string) => {
    setWeeklyAvailability((prev) => {
      const copy = { ...prev };
      if (copy[day]) {
        delete copy[day];
      } else {
        copy[day] = [{ start: "", end: "" }];
      }
      return copy;
    });
  };

  const addSlot = (day: string) => {
    setWeeklyAvailability((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: "", end: "" }],
    }));
  };

  const updateSlot = (
    day: string,
    index: number,
    field: "start" | "end",
    value: string,
  ) => {
    setWeeklyAvailability((prev) => {
      const updated = [...prev[day]];
      updated[index][field] = value;
      return { ...prev, [day]: updated };
    });
  };

  const removeSlot = (day: string, index: number) => {
    setWeeklyAvailability((prev) => {
      const slots = prev[day];
      if (!slots) return prev;
      const updated = slots.filter((_, i) => i !== index);
      const next = { ...prev };
      if (updated.length === 0) {
        delete next[day];
      } else {
        next[day] = updated;
      }
      return next;
    });
  };

  const validatePage1 = () => {
    const result = setupSchema
      .pick({ grade: true, timeZone: true })
      .safeParse({ grade, timeZone });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        errs[i.path.join(".")] = i.message;
      });
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  };

  const validatePage2 = () => {
    const result = setupSchema
      .pick({ availability: true })
      .safeParse({ availability: weeklyAvailability });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        errs[i.path.join(".")] = i.message;
      });
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await completeStudentSetup(
        studentId,
        grade,
        notes,
        timeZone,
        weeklyAvailability,
      );
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[520px] mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.1)] p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#2B4257]">
            Complete {firstName} {lastName}&apos;s Profile
          </h1>
          <p className="text-sm text-[#2B4257]/60 mt-1">
            Set up their details and availability so we can match them with a
            coach.
          </p>
          <div className="mt-3 w-16 h-1 bg-[#65CFAD] rounded-full" />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className={`h-2 flex-1 rounded-full transition-colors ${page >= 1 ? "bg-[#B1E7D6]" : "bg-gray-200"}`}
          />
          <div
            className={`h-2 flex-1 rounded-full transition-colors ${page >= 2 ? "bg-[#B1E7D6]" : "bg-gray-200"}`}
          />
        </div>

        {page === 1 && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (validatePage1()) setPage(2);
            }}
          >
            <div className="flex flex-col gap-1">
              <label className="text-sm text-[#A8A8A8]">Grade</label>
              <div className="relative h-[52px]">
                <select
                  value={grade}
                  onChange={(e) => {
                    setGrade(Number(e.target.value));
                    if (errors.grade)
                      setErrors((p) => {
                        const n = { ...p };
                        delete n.grade;
                        return n;
                      });
                  }}
                  className={`w-full h-full px-4 text-[18px] border bg-white appearance-none cursor-pointer rounded-lg ${errors.grade ? "border-red-500" : "border-[#1F2E3B]/20"} text-[#1F2E3B]`}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
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
              {errors.grade && (
                <p className="text-red-500 text-xs">{errors.grade}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-[#A8A8A8]">Time Zone</label>
              <div className="relative h-[52px]">
                <select
                  value={timeZone}
                  onChange={(e) => {
                    setTimeZone(e.target.value as OnboardingTimeZone);
                    if (errors.timeZone)
                      setErrors((p) => {
                        const n = { ...p };
                        delete n.timeZone;
                        return n;
                      });
                  }}
                  className={`w-full h-full px-4 text-[18px] text-[#1F2E3B] border bg-white appearance-none cursor-pointer rounded-lg ${errors.timeZone ? "border-red-500" : "border-[#1F2E3B]/20"}`}
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
              {errors.timeZone && (
                <p className="text-red-500 text-xs">{errors.timeZone}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-[#A8A8A8]">
                Additional notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any context that would help the coach..."
                className="w-full h-[100px] px-4 py-3 text-[16px] text-[#1F2E3B] placeholder-[#1F2E3B]/40 border border-[#1F2E3B]/20 rounded-lg resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full h-[48px] mt-2 bg-[#B1E7D6] rounded-[12px] text-[18px] font-semibold text-[#1F2E3B] hover:opacity-90 transition-opacity"
            >
              Next: Set Availability
            </button>

            <button
              type="button"
              onClick={() => router.push("/parent")}
              className="text-[#1F2E3B]/50 hover:underline text-sm text-center"
            >
              Back to dashboard
            </button>
          </form>
        )}

        {page === 2 && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (validatePage2()) handleSubmit();
            }}
          >
            <p className="text-sm text-[#A8A8A8]">
              Select the days and times {firstName} is available each week.
            </p>
            {errors.availability && (
              <p className="text-red-500 text-sm font-medium">
                {errors.availability}
              </p>
            )}

            <div className="flex flex-col gap-3">
              {DAYS.map((day) => {
                const enabled = !!weeklyAvailability[day];
                const slots = weeklyAvailability[day] || [];
                return (
                  <div
                    key={day}
                    className="border border-[#1F2E3B]/10 p-4 rounded-xl"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-[#1F2E3B]">
                        {day}
                      </span>
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
                        {slots.map((slot, idx) => (
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
                                className="text-red-400 hover:text-red-600 text-sm"
                              >
                                ✕
                              </button>
                            </div>
                            {errors[`availability.${day}.${idx}.end`] && (
                              <p className="text-red-500 text-xs">
                                {errors[`availability.${day}.${idx}.end`]}
                              </p>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addSlot(day)}
                          className="text-sm text-[#65CFAD] hover:underline mt-1 text-left"
                        >
                          + Add time
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[48px] mt-2 bg-[#B1E7D6] rounded-[12px] text-[18px] font-semibold text-[#1F2E3B] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                "Complete Setup"
              )}
            </button>

            <button
              type="button"
              onClick={() => setPage(1)}
              className="text-[#1F2E3B]/50 hover:underline text-sm text-center"
            >
              Back to student info
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
