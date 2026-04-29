"use client";

import { useState, useEffect } from "react";
import { Student } from "./StudentTable";

interface Props {
  student: Student;
  onClose: () => void;
  onUpdate: (updated: Student) => void;
}

const inputClass =
  "mt-1 block w-full bg-[#2B4257] border border-white/10 text-white placeholder:text-white/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#B1E7D6]/50 transition-colors";

const labelClass = "block text-[10px] font-semibold text-[#B1E7D6] uppercase tracking-widest mb-0.5";

export default function StudentDetailModal({ student, onClose, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
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
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#1F2E3B] rounded-2xl border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.6)] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1F2E3B] border-b border-white/10 px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
          <div>
            <h2 className="text-white font-bold text-lg">
              {isEditing ? (editForm.name ?? student.name) : student.name}
            </h2>
            <p className="text-[#B1E7D6] text-xs opacity-60 mt-0.5">Student profile</p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => { setEditForm({ ...student }); setIsEditing(true); }}
                  className="px-4 py-1.5 text-xs font-semibold text-[#1F2E3B] bg-[#B1E7D6] hover:bg-[#9ed4c1] rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEditSave}
                  disabled={isSaving}
                  className="px-4 py-1.5 text-xs font-semibold text-[#1F2E3B] bg-[#65CFAD] hover:bg-[#50bfa0] rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => { setEditForm({}); setIsEditing(false); }}
                  className="px-4 py-1.5 text-xs font-semibold text-white/70 bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Basic Information */}
          <section>
            <h3 className="text-xs font-semibold text-[#B1E7D6] uppercase tracking-widest mb-3 pb-2 border-b border-white/5">
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={labelClass}>Student ID</p>
                <p className="text-white/80 text-sm font-mono">{student.id}</p>
              </div>
              <div>
                <p className={labelClass}>Account ID</p>
                <p className="text-white/80 text-sm font-mono">{student.account_id}</p>
              </div>
              <div>
                <p className={labelClass}>Name</p>
                {isEditing ? (
                  <input type="text" value={editForm.name ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className={inputClass} />
                ) : (
                  <p className="text-white text-sm font-medium">{student.name || "—"}</p>
                )}
              </div>
              <div>
                <p className={labelClass}>Remaining Lessons</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.remaining_lessons ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, remaining_lessons: e.target.value === "" ? null : Number(e.target.value) }))}
                    className={inputClass}
                  />
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#B1E7D6]/10 text-[#B1E7D6]">
                    {student.remaining_lessons ?? "—"}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Lesson Space */}
          <section>
            <h3 className="text-xs font-semibold text-[#B1E7D6] uppercase tracking-widest mb-3 pb-2 border-b border-white/5">
              Lesson Space
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={labelClass}>Lesson Space ID</p>
                <p className="text-white/60 text-sm font-mono break-all">{student.lesson_space_id ?? "—"}</p>
              </div>
              <div>
                <p className={labelClass}>Profile Access PIN</p>
                {isEditing ? (
                  <input type="text" value={editForm.profile_access_pin ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, profile_access_pin: e.target.value }))} className={inputClass} />
                ) : (
                  <p className="text-white/80 text-sm font-mono">{student.profile_access_pin ?? "—"}</p>
                )}
              </div>
              <div className="col-span-2">
                <p className={labelClass}>Student Link</p>
                {isEditing ? (
                  <input type="text" value={editForm.lesson_space_student_link ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, lesson_space_student_link: e.target.value }))} className={inputClass} />
                ) : (
                  <p className="text-white/60 text-sm break-all">{student.lesson_space_student_link ?? "—"}</p>
                )}
              </div>
              <div className="col-span-2">
                <p className={labelClass}>Teacher Link</p>
                {isEditing ? (
                  <input type="text" value={editForm.lesson_space_teacher_link ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, lesson_space_teacher_link: e.target.value }))} className={inputClass} />
                ) : (
                  <p className="text-white/60 text-sm break-all">{student.lesson_space_teacher_link ?? "—"}</p>
                )}
              </div>
            </div>
          </section>

          {/* Other */}
          <section>
            <h3 className="text-xs font-semibold text-[#B1E7D6] uppercase tracking-widest mb-3 pb-2 border-b border-white/5">
              Other
            </h3>
            <div>
              <p className={labelClass}>Teachworks URL</p>
              {isEditing ? (
                <input type="text" value={editForm.teach_works_url ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, teach_works_url: e.target.value }))} className={inputClass} />
              ) : (
                <p className="text-white/60 text-sm break-all">{student.teach_works_url ?? "—"}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
