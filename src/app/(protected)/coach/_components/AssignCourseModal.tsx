import { useState } from "react";
import type { Database } from "@/src/services/supabase/types/database";
import { fullName } from "@/src/utils/formatName";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];

interface AssignCourseModalProps {
  student: Student;
  courses: Course[];
  coursesLoading: boolean;
  coursesError: string | null;
  setIsAssigningCourse: React.Dispatch<React.SetStateAction<boolean>>;
  onAssignedMessage: (message: {
    type: "error" | "success";
    text: string;
  }) => void;
}

export default function AssignCourseModal({
  student,
  courses,
  coursesLoading,
  coursesError,
  setIsAssigningCourse,
  onAssignedMessage,
}: AssignCourseModalProps) {
  const [assigningCourseId, setAssigningCourseId] = useState<string | null>(
    null,
  );
  const [inlineError, setInlineError] = useState<string | null>(null);

  const studentName = fullName(
    student.first_name,
    student.last_name,
    "this student",
  );

  async function assignStudent(course: Course) {
    setInlineError(null);
    setAssigningCourseId(course.id);
    try {
      const res = await fetch("/api/coach/courses/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, courseId: course.id }),
      });

      if (!res.ok) {
        throw new Error("Failed to assign course. Please try again.");
      }

      onAssignedMessage({
        type: "success",
        text: `Assigned "${course.title}" to ${studentName}.`,
      });
      setIsAssigningCourse(false);
    } catch (err: unknown) {
      setInlineError(
        err instanceof Error ? err.message : "Failed to assign course.",
      );
      onAssignedMessage({
        type: "error",
        text: `Could not assign "${course.title}" to ${studentName}.`,
      });
    } finally {
      setAssigningCourseId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => setIsAssigningCourse(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="px-6 py-5 border-b border-[#2B4257]/10 bg-[#2B4257]/5 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#2B4257]">
              Assign Course
            </h2>
            <p className="text-xs text-[#2B4257]/60 mt-0.5">
              Select a course for {studentName}
            </p>
          </div>
          <button
            onClick={() => setIsAssigningCourse(false)}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#2B4257]/50 hover:text-[#2B4257] hover:bg-[#2B4257]/10 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Course list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {inlineError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {inlineError}
            </p>
          )}

          {coursesLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-24 rounded-xl border border-gray-100 bg-gray-50 animate-pulse"
                />
              ))}
            </div>
          ) : coursesError ? (
            <p className="text-sm text-red-600 text-center py-10">
              {coursesError}
            </p>
          ) : courses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              No courses available.
            </p>
          ) : (
            courses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl border border-[#2B4257]/10 p-4 hover:border-[#2B4257]/25 hover:shadow-sm transition-all"
              >
                <h3 className="text-sm font-semibold text-gray-900">
                  {course.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {course.description || "No description provided."}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Created {new Date(course.created_at).toLocaleDateString()}
                </p>
                <button
                  disabled={assigningCourseId != null}
                  onClick={() => assignStudent(course)}
                  className="mt-3 w-full bg-[#2B4257] text-white text-xs font-medium py-2 rounded-lg hover:bg-[#2B4257]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigningCourseId === course.id
                    ? "Assigning..."
                    : "Assign This Course"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
