"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import ExternalLinkIcon from "./ui/ExternalLinkIcon";
import StatusBadge from "./ui/StatusBadge";
import type { Database } from "@/database";

type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type LessonProgress = Database["public"]["Tables"]["lesson_progress"]["Row"];

interface Course {
  id: string;
  title: string;
}

interface LessonsTableProps {
  studentId?: string | null;
  studentName?: string | null;
}

type LessonWithExtras = Lesson & {
  progress?: LessonProgress | null;
  courses?: Course | null;
};

type OrganizedLessons = {
  course_id: string;
  course_name: string;
  lessons: LessonWithExtras[];
  status: number[];
  pre_lesson_urls: (string | null)[];
  post_lesson_urls: (string | null)[];
  slide_show_inputs: (string | null)[];
};

function ExternalLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[#2B4257] hover:text-[#2B4257]/70 font-medium underline underline-offset-2"
    >
      View
      <ExternalLinkIcon size={11} />
    </a>
  );
}

export default function LessonsTable({
  studentId,
  studentName,
}: LessonsTableProps) {
  const [lessons, setLessons] = useState<OrganizedLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!studentId) {
        setLessons([]);
        return;
      }

      const res = await fetch(`/api/admin/students/lessons/${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch lessons");

      const data: OrganizedLessons[] = await res.json();
      setLessons(data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const handleStatusChange = async (lessonId: string, newStatus: number) => {
    if (!studentId) return;

    setUpdatingId(lessonId);
    try {
      const res = await fetch("/api/coach/lesson-progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          lesson_id: lessonId,
          status: newStatus,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      setLessons((prev) =>
        prev.map((courseGroup) => {
          const idx = courseGroup.lessons.findIndex((l) => l.id === lessonId);
          if (idx === -1) return courseGroup;

          const newStatusArr = [...courseGroup.status];
          newStatusArr[idx] = newStatus;
          return { ...courseGroup, status: newStatusArr };
        }),
      );
    } catch (err: unknown) {
      alert(
        "Error updating lesson status: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!Array.isArray(lessons)) return [];

    return lessons.flatMap((course) =>
      (course.lessons ?? [])
        .map((lesson, idx) => ({
          ...lesson,
          status: course.status?.[idx] ?? 1,
          course_name: course.course_name,
          pre_lesson_url: course.pre_lesson_urls?.[idx] ?? null,
          post_lesson_url: course.post_lesson_urls?.[idx] ?? null,
          slide_show_input: course.slide_show_inputs?.[idx] ?? null,
        }))
        .filter(
          (lesson) =>
            lesson.title.toLowerCase().includes(search.toLowerCase()) ||
            lesson.course_name.toLowerCase().includes(search.toLowerCase()),
        ),
    );
  }, [lessons, search]);

  const showProgress = Boolean(studentId);

  return (
    <div className="rounded-2xl bg-white border border-[#2B4257]/10 shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="px-5 py-4 border-b border-[#2B4257]/10 bg-[#2B4257]/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#2B4257]">
            {showProgress && studentName
              ? `Lessons — ${studentName}`
              : "Lessons"}
          </h2>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="bg-[#2B4257]/10 text-[#2B4257] text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
            {loading ? "..." : `${filtered.length} lessons`}
          </span>
          <input
            type="search"
            placeholder="Search lessons…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2B4257]/30 w-44"
          />
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="p-6 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse h-10 bg-gray-100 rounded-lg"
            />
          ))}
        </div>
      ) : error ? (
        <div className="p-10 text-center text-red-600 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-sm">
          {search
            ? "No lessons match your search."
            : showProgress
              ? "No lessons found for this student."
              : "Select a student above to view lessons."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Title</th>
                <th className="px-5 py-3 text-left font-medium">Course</th>
                <th className="px-5 py-3 text-left font-medium">Description</th>
                <th className="px-5 py-3 text-left font-medium">Pre-Lesson</th>
                <th className="px-5 py-3 text-left font-medium">Post-Lesson</th>
                <th className="px-5 py-3 text-left font-medium">Slides</th>
                {showProgress && (
                  <th className="px-5 py-3 text-left font-medium">Progress</th>
                )}
                <th className="px-5 py-3 text-left font-medium">Created</th>
                {showProgress && (
                  <th className="px-5 py-3 text-left font-medium">Details</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((lesson) => {
                const isUpdating = updatingId === lesson.id;

                return (
                  <tr
                    key={lesson.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                      {lesson.title}
                    </td>

                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                      {lesson.course_name || (
                        <span className="text-gray-400 italic">No course</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-gray-600 max-w-[200px] truncate">
                      {lesson.description || (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {lesson.pre_lesson_url ? (
                        <ExternalLink href={lesson.pre_lesson_url} />
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {lesson.post_lesson_url ? (
                        <ExternalLink href={lesson.post_lesson_url} />
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {lesson.slide_show_input ? (
                        <ExternalLink href={lesson.slide_show_input} />
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>

                    {showProgress && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={lesson.status} />
                          <select
                            disabled={isUpdating}
                            value={lesson.status}
                            onChange={(e) =>
                              handleStatusChange(
                                lesson.id,
                                Number(e.target.value),
                              )
                            }
                            className="border border-gray-200 rounded-md text-xs py-1 px-2 focus:outline-none focus:ring-2 focus:ring-[#2B4257]/30 disabled:opacity-50 cursor-pointer"
                          >
                            <option value={1}>Not Started</option>
                            <option value={2}>In Progress</option>
                            <option value={3}>Completed</option>
                          </select>
                          {isUpdating && (
                            <div className="w-3.5 h-3.5 border-2 border-[#2B4257] border-t-transparent rounded-full animate-spin" />
                          )}
                        </div>
                      </td>
                    )}

                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                      {new Date(lesson.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {showProgress && studentId && (
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/coach/students/${studentId}/lessons/${lesson.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#2B4257] hover:text-[#2B4257]/70 border border-[#2B4257]/25 rounded-md px-2.5 py-1.5 hover:bg-[#2B4257]/5 transition-colors whitespace-nowrap"
                        >
                          View Details
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
