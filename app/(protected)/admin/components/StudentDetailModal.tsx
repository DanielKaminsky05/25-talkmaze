"use client";

import { useState, useEffect } from "react";
import { Student } from "./StudentTable";

interface Props {
  student: Student;
  onClose: () => void;
  onUpdate: (updated: Student) => void;
}

const inputClass =
  "mt-0.5 block w-full border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function StudentDetailModal({ student, onClose, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleEditSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/students/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student: editForm }),
      });
      if (!response.ok) throw new Error("Failed to update student");
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
            {isEditing ? (editForm.name ?? student.name) : student.name}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => { setEditForm({ ...student }); setIsEditing(true); }}
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
                  onClick={handleEditSave}
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
                <span className="text-gray-500">Student ID:</span>
                <p className="text-gray-900 font-medium">{student.id}</p>
              </div>
              <div>
                <span className="text-gray-500">Account ID:</span>
                <p className="text-gray-900 font-medium">{student.account_id}</p>
              </div>
              <div>
                <span className="text-gray-500">Name:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className={inputClass}
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{student.name || "N/A"}</p>
                )}
              </div>
              <div>
                <span className="text-gray-500">Remaining Lessons:</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.remaining_lessons ?? ""}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        remaining_lessons: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                    className={inputClass}
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{student.remaining_lessons ?? "N/A"}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Lesson Space Information</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Lesson Space ID:</span>
                <p className="text-gray-900 font-medium break-all">{student.lesson_space_id ?? "N/A"}</p>
              </div>
              <div>
                <span className="text-gray-500">Profile Access PIN:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.profile_access_pin ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, profile_access_pin: e.target.value }))}
                    className={inputClass}
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{student.profile_access_pin ?? "N/A"}</p>
                )}
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Student Link:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.lesson_space_student_link ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, lesson_space_student_link: e.target.value }))}
                    className={inputClass}
                  />
                ) : (
                  <p className="text-gray-900 font-medium break-all">{student.lesson_space_student_link ?? "N/A"}</p>
                )}
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Teacher Link:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.lesson_space_teacher_link ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, lesson_space_teacher_link: e.target.value }))}
                    className={inputClass}
                  />
                ) : (
                  <p className="text-gray-900 font-medium break-all">{student.lesson_space_teacher_link ?? "N/A"}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Other Information</h3>
            <div className="grid grid-cols-1 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Teachworks URL:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.teach_works_url ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, teach_works_url: e.target.value }))}
                    className={inputClass}
                  />
                ) : (
                  <p className="text-gray-900 font-medium break-all">{student.teach_works_url ?? "N/A"}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
