"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/services/supabase/client";
import CourseLessonsPanel from "./CourseLessonPanel";
import { Student } from "./AssignStudentDropDown";
import { Course } from "./types";

interface Props {
  course: Course;
  students: Student[];
  onClose: () => void;
  onUpdate: (updated: Course) => void;
  onDelete: () => void;
}

export default function CourseDetailModal({ course, students, onClose, onUpdate, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Course>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [badge, setBadge] = useState<{ id: string; title: string; image_url: string | null } | null>(null);
  const [badgeTitle, setBadgeTitle] = useState("");
  const [uploadingBadge, setUploadingBadge] = useState(false);
  const badgeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("badges")
      .select("id, title, image_url")
      .eq("course_id", String(course.id))
      .maybeSingle()
      .then(({ data }) => {
        setBadge(data ?? null);
        setBadgeTitle(data?.title ?? "");
      });
  }, [course.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: editForm }),
      });
      if (!response.ok) throw new Error("Failed to update course");
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

  const handleDelete = async () => {
    if (!confirm(`Delete "${course.name}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete course");
      onDelete();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBadgeUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "image/png") {
      alert("PNG only");
      return;
    }
    setUploadingBadge(true);
    const supabase = createClient();

    let b = badge;
    if (!b) {
      const { data: newBadge } = await supabase
        .from("badges")
        .insert({ course_id: String(course.id), title: badgeTitle || course.name })
        .select("id, title, image_url")
        .single();
      b = newBadge;
    }
    if (!b) {
      setUploadingBadge(false);
      return;
    }

    const path = `${b.id}.png`;
    await supabase.storage.from("badges").upload(path, file, { upsert: true, contentType: "image/png" });
    const {
      data: { publicUrl },
    } = supabase.storage.from("badges").getPublicUrl(path);
    await supabase
      .from("badges")
      .update({ image_url: publicUrl, title: badgeTitle || b.title })
      .eq("id", b.id);

    setBadge({ ...b, image_url: publicUrl, title: badgeTitle || b.title });
    setUploadingBadge(false);
  };

  const inputClass =
    "mt-0.5 block w-full border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500";

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
            {isEditing ? (editForm.name ?? course.name) : course.name}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  onClick={() => { setEditForm({ ...course }); setIsEditing(true); }}
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

        <div className="px-6 py-4 space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Course Information</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-500">Course ID:</span>
                <p className="text-gray-900 font-medium">{course.id}</p>
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
                  <p className="text-gray-900 font-medium">{course.name}</p>
                )}
              </div>
              <div>
                <span className="text-gray-500">Description:</span>
                {isEditing ? (
                  <textarea
                    value={editForm.description ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    rows={4}
                    className={inputClass}
                  />
                ) : (
                  <p className="text-gray-900">{course.description || "N/A"}</p>
                )}
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Course Badge</p>
            <div className="flex items-center gap-3">
              {badge?.image_url ? (
                <img
                  src={badge.image_url}
                  className="w-16 h-16 object-contain rounded-lg border"
                  alt="Badge"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 border flex items-center justify-center text-gray-400 text-xs">
                  None
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <input
                  value={badgeTitle}
                  onChange={(e) => setBadgeTitle(e.target.value)}
                  placeholder="Badge title"
                  className="px-2 py-1 text-xs border rounded"
                />
                <input
                  type="file"
                  accept="image/png"
                  ref={badgeInputRef}
                  onChange={(e) => handleBadgeUpload(e.target.files?.[0])}
                  className="hidden"
                />
                <button
                  onClick={() => badgeInputRef.current?.click()}
                  disabled={uploadingBadge}
                  className="px-3 py-1 text-xs bg-purple-600 text-white rounded disabled:opacity-50 hover:bg-purple-700 transition-colors"
                >
                  {uploadingBadge ? "Uploading…" : badge ? "Replace image" : "Upload PNG"}
                </button>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          <CourseLessonsPanel students={students} courseId={String(course.id)} />
        </div>
      </div>
    </div>
  );
}
