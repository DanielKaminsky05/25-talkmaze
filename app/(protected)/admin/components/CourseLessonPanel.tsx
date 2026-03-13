"use client";

import { useEffect, useState } from "react";
import { Lesson, LessonInput } from "@/lib/types/lesson";

interface CourseLessonsPanelProps {
  courseId: string;
}

const EMPTY_FORM: LessonInput = {
  title: "",
  description: "",
  content_url: "",
};

export default function CourseLessonsPanel({ courseId }: CourseLessonsPanelProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<LessonInput>({ ...EMPTY_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LessonInput>({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Deleting
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/courses/${courseId}/lessons`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLessons(data);
        else setError(data.error ?? "Failed to load lessons");
      })
      .catch(() => setError("Failed to load lessons"))
      .finally(() => setLoading(false));
  }, [courseId]);

  const handleAdd = async () => {
    if (!addForm.title.trim()) { setAddError("Title is required."); return; }
    setIsSubmitting(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addForm.title.trim(),
          description: addForm.description?.trim() || null,
          content_url: addForm.content_url?.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create lesson");
      setLessons((prev) => [...prev, data]);
      setAddForm({ ...EMPTY_FORM });
      setIsAdding(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (lesson: Lesson) => {
    setEditingId(lesson.id);
    setEditForm({
      title: lesson.title,
      description: lesson.description ?? "",
      content_url: lesson.content_url ?? "",
    });
    setEditError(null);
  };

  const handleSave = async (lessonId: string) => {
    if (!editForm.title.trim()) { setEditError("Title is required."); return; }
    setIsSaving(true);
    setEditError(null);
    try {
      const res = await fetch(
        `/api/admin/courses/${courseId}/lessons/${lessonId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editForm.title.trim(),
            description: editForm.description?.trim() || null,
            content_url: editForm.content_url?.trim() || null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update lesson");
      setLessons((prev) => prev.map((l) => (l.id === lessonId ? data : l)));
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (lessonId: string, title: string) => {
    if (!confirm(`Delete lesson "${title}"? This cannot be undone.`)) return;
    setDeletingId(lessonId);
    try {
      const res = await fetch(
        `/api/admin/courses/${courseId}/lessons/${lessonId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete lesson");
      }
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      if (editingId === lessonId) setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting lesson");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Lessons</h3>
        {!isAdding && (
          <button
            onClick={() => { setIsAdding(true); setAddError(null); setAddForm({ ...EMPTY_FORM }); }}
            className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            + Add Lesson
          </button>
        )}
      </div>

      {/* Add lesson form */}
      {isAdding && (
        <div className="mb-3 border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-2">
          <p className="text-xs font-medium text-blue-800">New Lesson</p>
          {addError && (
            <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{addError}</p>
          )}
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={addForm.title}
              onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Introduction to Algebra"
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">Description</label>
            <textarea
              value={addForm.description ?? ""}
              onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="Optional description..."
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">Content URL</label>
            <input
              type="url"
              value={addForm.content_url ?? ""}
              onChange={(e) => setAddForm((p) => ({ ...p, content_url: e.target.value }))}
              placeholder="https://..."
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={isSubmitting}
              className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add"}
            </button>
            <button
              onClick={() => { setIsAdding(false); setAddError(null); }}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Lesson list */}
      {loading ? (
        <p className="text-xs text-gray-500 py-2">Loading lessons…</p>
      ) : error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : lessons.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-2">No lessons yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson, idx) => (
            <div
              key={lesson.id}
              className="border border-gray-200 rounded-lg bg-white overflow-hidden"
            >
              {editingId === lesson.id ? (
                <div className="p-3 space-y-2">
                  {editError && (
                    <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{editError}</p>
                  )}
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">Description</label>
                    <textarea
                      value={editForm.description ?? ""}
                      onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                      rows={2}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-0.5">Content URL</label>
                    <input
                      type="url"
                      value={editForm.content_url ?? ""}
                      onChange={(e) => setEditForm((p) => ({ ...p, content_url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(lesson.id)}
                      disabled={isSaving}
                      className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
                    >
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditError(null); }}
                      className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 px-3 py-2.5">
                  {/* Order badge */}
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{lesson.title}</p>
                    {lesson.description && (
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{lesson.description}</p>
                    )}
                    {lesson.content_url && (
                      <a
                        href={lesson.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-blue-500 hover:underline mt-0.5 block truncate"
                      >
                        {lesson.content_url}
                      </a>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <button
                      onClick={() => startEdit(lesson)}
                      className="px-2 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(lesson.id, lesson.title)}
                      disabled={deletingId === lesson.id}
                      className="px-2 py-0.5 text-[11px] font-medium text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                    >
                      {deletingId === lesson.id ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}