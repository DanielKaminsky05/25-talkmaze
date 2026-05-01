"use client";

import { useEffect, useState } from "react";
import { X, ChevronDown } from "lucide-react";
import type { StudentProp } from "./ParentSessionsClient";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const DAY_MAP: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

type Slot = { start: string; end: string };
type Availability = Record<string, Slot[]>;

interface Props {
  students: StudentProp[];
  initialStudentId: string | null;
  onClose: () => void;
}

export default function AvailabilityModal({
  students,
  initialStudentId,
  onClose,
}: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId ?? students[0]?.id ?? "",
  );
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [availability, setAvailability] = useState<Availability>({});
  const [timezone, setTimezone] = useState("America/Toronto");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    fetch(`/api/parent/students/${selectedStudentId}/availability`)
      .then((r) => r.json())
      .then(
        (
          rows: {
            weekday: number;
            start_time: string;
            end_time: string;
            timezone: string;
          }[],
        ) => {
          const mapped: Availability = {};
          rows.forEach(({ weekday, start_time, end_time, timezone: tz }) => {
            const day = DAY_MAP[weekday];
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

  const toggleDay = (day: string) => {
    setAvailability((prev) => {
      const copy = { ...prev };
      if (copy[day]) delete copy[day];
      else copy[day] = [{ start: "", end: "" }];
      return copy;
    });
  };

  const updateSlot = (
    day: string,
    idx: number,
    field: "start" | "end",
    value: string,
  ) => {
    setAvailability((prev) => {
      const updated = [...prev[day]];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, [day]: updated };
    });
  };

  const removeSlot = (day: string, idx: number) => {
    setAvailability((prev) => {
      const filtered = prev[day].filter((_, i) => i !== idx);
      const copy = { ...prev };
      if (filtered.length === 0) delete copy[day];
      else copy[day] = filtered;
      return copy;
    });
  };

  const addSlot = (day: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: [...prev[day], { start: "", end: "" }],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

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
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-[#1F2E3B] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2B4257]">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-semibold text-base">
              Edit Availability
            </h2>

            {students.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setStudentDropdownOpen((v) => !v)}
                  className="flex items-center gap-1.5 bg-[#142535] border border-[#2B4257] hover:border-[#65CFAD] text-white text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <span>{[selectedStudent?.first_name, selectedStudent?.last_name].filter(Boolean).join(" ") || "Student"}</span>
                  <ChevronDown
                    size={11}
                    className={`text-[#65CFAD] transition-transform ${studentDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {studentDropdownOpen && (
                  <div className="absolute top-full mt-1.5 left-0 z-20 bg-[#1F2E3B] border border-[#2B4257] rounded-xl shadow-2xl min-w-[160px] overflow-hidden">
                    {students.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setStudentDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors cursor-pointer ${selectedStudentId === s.id
                            ? "bg-[#65CFAD]/20 text-[#65CFAD] font-semibold"
                            : "text-white hover:bg-[#142535]"
                          }`}
                      >
                        {[s.first_name, s.last_name].filter(Boolean).join(" ") || "Student"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-[#65CFAD] hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-[#65CFAD] text-sm">Loading…</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Timezone badge */}
              <p className="text-[#65CFAD] text-xs mb-2">
                Timezone: <span className="text-white">{timezone}</span>
              </p>

              {DAYS.map((day) => {
                const enabled = !!availability[day];
                const slots = availability[day] ?? [];

                return (
                  <div
                    key={day}
                    className="rounded-xl border border-[#2B4257] bg-[#142535] p-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-white">
                        {day}
                      </span>

                      {/* Toggle */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => toggleDay(day)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[#2B4257] rounded-full peer peer-checked:bg-[#65CFAD]" />
                        <div className="absolute left-1 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                      </label>
                    </div>

                    {enabled && (
                      <div className="flex flex-col gap-1.5 mt-2">
                        {slots.map((slot, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) =>
                                updateSlot(day, idx, "start", e.target.value)
                              }
                              className="bg-[#1F2E3B] border border-[#2B4257] text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-[#65CFAD]"
                            />
                            <span className="text-[#65CFAD] text-xs">–</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) =>
                                updateSlot(day, idx, "end", e.target.value)
                              }
                              className="bg-[#1F2E3B] border border-[#2B4257] text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-[#65CFAD]"
                            />
                            <button
                              type="button"
                              onClick={() => removeSlot(day, idx)}
                              className="text-red-400 hover:text-red-300 text-xs transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => addSlot(day)}
                          className="text-xs text-[#65CFAD] hover:text-white transition-colors text-left mt-0.5 cursor-pointer"
                        >
                          + Add time
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2B4257] flex items-center justify-between">
          <div className="text-xs">
            {saveError && <span className="text-red-400">{saveError}</span>}
            {saveSuccess && (
              <span className="text-[#65CFAD]">Saved successfully!</span>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 text-sm font-semibold bg-[#65CFAD] text-[#1F2E3B] rounded-xl hover:bg-[#4fbfa0] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
