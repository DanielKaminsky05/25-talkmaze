"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { StudentProp } from "./ParentSessionsClient";
import { WEEKDAYS } from "@/src/lib/scheduling/types";
import { availabilityFormSchema } from "@/src/lib/scheduling/schemas";
import Dropdown, { DropdownItem } from "@/src/components/ui/Dropdown";
import WeeklyAvailabilityEditor, {
  WeeklyAvailabilityValue,
} from "../../../_components/WeeklyAvailabilityEditor";

interface Props {
  students: StudentProp[];
  /** Pre-select a specific student; null falls back to the first in the list. */
  initialStudentId: string | null;
  onClose: () => void;
}

/**
 * Parent-facing modal for editing a student's recurring weekly availability.
 *
 * Owns the modal chrome (header, student switcher, footer save/error feedback)
 * and the network calls; the day/slot UI is delegated to WeeklyAvailabilityEditor
 * so the look-and-feel matches the onboarding flow.
 */
export default function AvailabilityModal({
  students,
  initialStudentId,
  onClose,
}: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId ?? students[0]?.id ?? "",
  );
  const [availability, setAvailability] = useState<WeeklyAvailabilityValue>({});
  const [timezone, setTimezone] = useState("America/Toronto");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    setErrors({});

    fetch(`/api/parent/students/${selectedStudentId}/availability`)
      .then((r) => r.json())
      .then(
        (body: {
          availability?: {
            weekday: number;
            start_time: string;
            end_time: string;
            timezone: string;
          }[];
        }) => {
          const rows = Array.isArray(body?.availability)
            ? body.availability
            : [];
          const mapped: WeeklyAvailabilityValue = {};
          rows.forEach(({ weekday, start_time, end_time, timezone: tz }) => {
            // DB stores weekday Sunday-first (0..6); WEEKDAYS is Monday-first.
            // Shift by +6 mod 7 to translate: Sun(0)→idx 6, Mon(1)→idx 0, etc.
            const day = WEEKDAYS[(weekday + 6) % 7];
            // start_time/end_time are ISO timestamps like "1970-01-01T14:30:00Z";
            // slice out just the "HH:mm" portion that <input type="time"> expects.
            const start = start_time.slice(11, 16);
            const end = end_time.slice(11, 16);
            if (!mapped[day]) mapped[day] = [];
            mapped[day].push({ start, end });
            setTimezone(tz);
          });
          setAvailability(mapped);
        },
      )
      .finally(() => setLoading(false));
  }, [selectedStudentId]);

  /**
   * Validates locally with Zod before issuing the PUT so users see per-slot errors
   * (e.g. end <= start) without a server round-trip. On success, clears errors,
   * persists, and briefly flashes the success message.
   */
  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);

    const parsed = availabilityFormSchema.safeParse({
      availability,
      timeZone: timezone,
    });
    if (!parsed.success) {
      // Flatten Zod issues into a path-keyed map the editor knows how to display
      // (see WeeklyAvailabilityEditor's `errors` prop for the recognized keys).
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        next[i.path.join(".")] = i.message;
      });
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);

    const res = await fetch(
      `/api/parent/students/${selectedStudentId}/availability`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability, timezone }),
      },
    );

    setSaving(false);

    if (res.ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } else {
      const body = await res.json().catch(() => ({}));
      setSaveError(body.error ?? "Failed to save. Please try again.");
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F2E3B]/10">
          <div className="flex items-center gap-3">
            <h2 className="text-[#2B4257] font-semibold text-base">
              Edit Availability
            </h2>

            {students.length > 1 && (
              <Dropdown
                label={
                  [selectedStudent?.first_name, selectedStudent?.last_name]
                    .filter(Boolean)
                    .join(" ") || "Student"
                }
                align="left"
              >
                {({ close }) => (
                  <>
                    {students.map((s) => (
                      <DropdownItem
                        key={s.id}
                        active={selectedStudentId === s.id}
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          close();
                        }}
                      >
                        {[s.first_name, s.last_name]
                          .filter(Boolean)
                          .join(" ") || "Student"}
                      </DropdownItem>
                    ))}
                  </>
                )}
              </Dropdown>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-[#2B4257]/60 hover:text-[#2B4257] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-[#2B4257]/60 text-sm">Loading…</p>
            </div>
          ) : (
            <WeeklyAvailabilityEditor
              value={availability}
              onChange={setAvailability}
              timezone={timezone}
              onTimezoneChange={setTimezone}
              errors={errors}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1F2E3B]/10 flex items-center justify-between">
          <div className="text-xs">
            {saveError && <span className="text-red-500">{saveError}</span>}
            {saveSuccess && (
              <span className="text-[#2B4257]">Saved successfully!</span>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 text-sm font-semibold bg-[#B1E7D6] text-[#1F2E3B] rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
