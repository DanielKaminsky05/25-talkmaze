"use client";

import { useState, useEffect } from "react";
import { Coach } from "./AssignStudentDropDown";

type Availability = Record<string, { start: string; end: string }[]>;

const DAY_MAP: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface Props {
  employee: Coach;
  onClose: () => void;
  onUpdate: (updated: Coach) => void;
}

export default function EmployeeDetailModal({ employee, onClose, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Coach>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [availability, setAvailability] = useState<Availability>({});

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    async function fetchAvailability() {
      const res = await fetch(`/api/admin/employees/${employee.id}/availability`);
      if (!res.ok) return;
      const rows: { weekday: number; start_time: string; end_time: string }[] = await res.json();
      const mapped: Availability = {};
      rows.forEach(({ weekday, start_time, end_time }) => {
        const day = DAY_MAP[weekday];
        const start = start_time.slice(11, 16);
        const end = end_time.slice(11, 16);
        if (!mapped[day]) mapped[day] = [];
        mapped[day].push({ start, end });
      });
      setAvailability(mapped);
    }
    fetchAvailability();
  }, [employee.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee: editForm }),
      });
      if (!response.ok) throw new Error("Failed to update employee");
      const updated = await response.json();
      onUpdate(updated);
      setIsEditing(false);
      setEditForm({});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAvailability = async () => {
    const res = await fetch(`/api/admin/employees/${employee.id}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability }),
    });
    if (!res.ok) {
      alert("Failed to save availability");
      return;
    }
    alert("Availability saved!");
  };

  const inputClass =
    "mt-0.5 block w-full border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500";

  const Field = ({
    label,
    fieldKey,
    colSpan = "",
  }: {
    label: string;
    fieldKey: keyof Coach;
    colSpan?: string;
  }) => (
    <div className={colSpan}>
      <span className="text-gray-500">{label}:</span>
      {isEditing ? (
        <input
          type="text"
          value={(editForm[fieldKey] as string) ?? ""}
          onChange={(e) => setEditForm((p) => ({ ...p, [fieldKey]: e.target.value }))}
          className={inputClass}
        />
      ) : (
        <p className="text-gray-900 font-medium">{(employee[fieldKey] as string) || "N/A"}</p>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing
              ? `${(editForm as any).first_name ?? employee.first_name} ${(editForm as any).last_name ?? employee.last_name}`
              : `${employee.first_name} ${employee.last_name}`}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => { setEditForm({ ...employee }); setIsEditing(true); }}
                  className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => { setEditForm({}); setIsEditing(false); }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Basic Information</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Coach ID:</span>
                <p className="text-gray-900 font-medium">{employee.id}</p>
              </div>
              <div>
                <span className="text-gray-500">Account ID:</span>
                <p className="text-gray-900 font-medium">{employee.account_id}</p>
              </div>
              <Field label="First Name" fieldKey="first_name" colSpan="col-span-1" />
              <Field label="Last Name" fieldKey="last_name" colSpan="col-span-1" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Timestamps</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Created At:</span>
                <p className="text-gray-900 font-medium">{employee.created_at || "N/A"}</p>
              </div>
              <div>
                <span className="text-gray-500">Updated At:</span>
                <p className="text-gray-900 font-medium">{employee.updated_at || "N/A"}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Weekly Availability</h3>
              <button
                onClick={handleSaveAvailability}
                className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                Save Availability
              </button>
            </div>

            {DAYS.map((day) => {
              const enabled = !!availability[day];
              const slots = availability[day] || [];
              return (
                <div key={day} className="border rounded p-3 mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-gray-700">{day}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() =>
                          setAvailability((prev) => {
                            const copy = { ...prev };
                            if (copy[day]) delete copy[day];
                            else copy[day] = [{ start: "", end: "" }];
                            return copy;
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#B1E7D6]" />
                      <div className="absolute left-1 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                    </label>
                  </div>
                  {enabled && (
                    <div className="flex flex-col gap-1 mt-1">
                      {slots.map((slot, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) =>
                              setAvailability((prev) => {
                                const updated = [...prev[day]];
                                updated[idx] = { ...updated[idx], start: e.target.value };
                                return { ...prev, [day]: updated };
                              })
                            }
                            className="border rounded px-1 py-0.5 text-xs"
                          />
                          <span className="text-xs">–</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) =>
                              setAvailability((prev) => {
                                const updated = [...prev[day]];
                                updated[idx] = { ...updated[idx], end: e.target.value };
                                return { ...prev, [day]: updated };
                              })
                            }
                            className="border rounded px-1 py-0.5 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setAvailability((prev) => {
                                const filtered = prev[day].filter((_, i) => i !== idx);
                                const copy = { ...prev };
                                if (filtered.length === 0) delete copy[day];
                                else copy[day] = filtered;
                                return copy;
                              })
                            }
                            className="text-red-500 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setAvailability((prev) => ({
                            ...prev,
                            [day]: [...prev[day], { start: "", end: "" }],
                          }))
                        }
                        className="text-xs text-green-600 mt-1"
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
      </div>
    </div>
  );
}
