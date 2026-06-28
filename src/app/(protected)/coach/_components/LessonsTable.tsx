"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { ChevronRight } from "lucide-react";

import { SearchInput } from "@/src/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import ExternalLinkIcon from "./ui/ExternalLinkIcon";
import type { Database } from "@/src/services/supabase/types/database";

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

function ExternalLink({
  href,
  label = "View",
}: {
  href: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[#2B4257] hover:text-[#2B4257]/70 font-medium underline underline-offset-2"
    >
      {label}
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
  const [tableMessage, setTableMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!studentId) {
        setLessons([]);
        return;
      }

      const res = await fetch(`/api/coach/students/lessons/${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch lessons");

      const body = await res.json();
      const data: OrganizedLessons[] = Array.isArray(body?.courses)
        ? body.courses
        : Array.isArray(body)
          ? body
          : [];
      setLessons(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
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
    setTableMessage(null);
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
      setTableMessage({ type: "success", text: "Lesson status updated." });
    } catch (err: unknown) {
      setTableMessage({
        type: "error",
        text: `Error updating lesson status: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      });
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
    <div className="rounded-2xl bg-white border border-[#2B4257]/10 shadow-sm overflow-hidden h-full min-h-0 flex flex-col">
      {/* Table header */}
      <div className="px-5 py-4 border-b border-[#2B4257]/10 bg-[#2B4257]/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#2B4257]">
            {showProgress && studentName
              ? `Lessons — ${studentName}`
              : "Lessons"}
          </h2>
          {tableMessage && (
            <p
              className={`text-xs mt-1 ${
                tableMessage.type === "error"
                  ? "text-red-600"
                  : "text-emerald-700"
              }`}
            >
              {tableMessage.text}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="bg-[#2B4257]/10 text-[#2B4257] text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
            {loading ? "..." : `${filtered.length} lessons`}
          </span>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lessons…"
            aria-label="Search lessons"
            variant="light"
            size="sm"
            iconSize={16}
            containerClassName="w-full sm:w-44"
            className="min-h-11 md:min-h-9"
          />
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse h-10 bg-gray-100 rounded-lg"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-10 text-center text-red-600 text-sm">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-10 text-center text-gray-400 text-sm">
          {search
            ? "No lessons match your search."
            : showProgress
              ? "No lessons found for this student."
              : "Select a student above to view lessons."}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Title</th>
                <th className="px-5 py-3 text-left font-medium">Course</th>
                <th className="px-5 py-3 text-left font-medium hidden 2xl:table-cell">
                  Description
                </th>
                <th className="px-5 py-3 text-left font-medium">Resources</th>
                {showProgress && (
                  <th className="px-5 py-3 text-left font-medium">Progress</th>
                )}
                <th className="px-5 py-3 text-left font-medium hidden 2xl:table-cell">
                  Created
                </th>
                {showProgress && (
                  <th className="px-3 py-3 text-left font-medium">Details</th>
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

                    <td className="px-5 py-3.5 text-gray-600 max-w-[200px] truncate hidden 2xl:table-cell">
                      {lesson.description || (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 text-xs">
                        {lesson.pre_lesson_url ? (
                          <ExternalLink
                            href={lesson.pre_lesson_url}
                            label="Pre"
                          />
                        ) : (
                          <span className="text-gray-400">Pre</span>
                        )}
                        <span className="text-gray-300">·</span>
                        {lesson.post_lesson_url ? (
                          <ExternalLink
                            href={lesson.post_lesson_url}
                            label="Post"
                          />
                        ) : (
                          <span className="text-gray-400">Post</span>
                        )}
                        <span className="text-gray-300">·</span>
                        {lesson.slide_show_input ? (
                          <ExternalLink
                            href={lesson.slide_show_input}
                            label="Slides"
                          />
                        ) : (
                          <span className="text-gray-400">Slides</span>
                        )}
                      </div>
                    </td>

                    {showProgress && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Select
                            value={String(lesson.status)}
                            onValueChange={(v) =>
                              handleStatusChange(lesson.id, Number(v))
                            }
                            disabled={isUpdating}
                          >
                            <SelectTrigger
                              variant="light"
                              size="sm"
                              aria-label="Lesson status"
                              className="w-36 min-h-11 md:min-h-9"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent variant="light">
                              <SelectItem value="1">Not Started</SelectItem>
                              <SelectItem value="2">In Progress</SelectItem>
                              <SelectItem value="3">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          {isUpdating && (
                            <div className="w-3.5 h-3.5 border-2 border-[#2B4257] border-t-transparent rounded-full animate-spin" />
                          )}
                        </div>
                      </td>
                    )}

                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap hidden 2xl:table-cell">
                      {new Date(lesson.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {showProgress && studentId && (
                      <td className="px-3 py-3.5">
                        <Link
                          href={`/coach/students/${studentId}/lessons/${lesson.id}`}
                          title="View lesson details"
                          className="inline-flex items-center justify-center w-11 h-11 md:w-7 md:h-7 text-[#2B4257] hover:text-[#2B4257]/70 border border-[#2B4257]/25 rounded-md hover:bg-[#2B4257]/5 transition-colors"
                        >
                          <ChevronRight size={15} />
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
