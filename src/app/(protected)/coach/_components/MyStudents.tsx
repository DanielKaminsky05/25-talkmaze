"use client";

import { useEffect, useState } from "react";
import AssignCourseModal from "./AssignCourseModal";
import StudentListItem from "./students-list/StudentListItem";
import type { Database } from "@/src/services/supabase/types/database";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];

interface MyStudentsProps {
  activeStudentId?: string | null;
  onStudentClick?: (student: Student | null) => void;
  onMessageClick?: (student: Student | null) => void;
  coachId: string;
}

export default function MyStudents({
  activeStudentId,
  onStudentClick,
  onMessageClick,
  coachId,
}: MyStudentsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssigningCourse, setIsAssigningCourse] = useState(false);
  const [assigningStudent, setAssigningStudent] = useState<Student | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const STUDENTS_PER_PAGE = 6;

  useEffect(() => {
    Promise.all([
      fetch("/api/coach/students").then((r) => {
        if (!r.ok) throw new Error("Failed to load students");
        return r.json();
      }),
      fetch("/api/admin/courses").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([studentsData, coursesData]) => {
        setStudents(studentsData);
        setCourses(coursesData);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleLessonSpace(studentId: string) {
    try {
      const res = await fetch(
        `/api/coach/lessonspace/${coachId}/${studentId}`,
      );
      if (!res.ok) {
        alert("Error fetching lesson room");
        return;
      }
      const { client_url } = await res.json();
      window.location.href = client_url;
    } catch {
      alert("Error fetching lesson room");
    }
  }

  return (
    <>
      <div className="rounded-2xl bg-white border border-[#2B4257]/10 shadow-sm overflow-hidden flex flex-col">
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-[#2B4257]/10 bg-[#B1E7D6] flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold text-[#1F2E3B]">
            My Students
          </h2>
          {!loading && !error && (
            <span className="bg-white/60 text-[#1F2E3B] text-xs font-semibold px-2.5 py-1 rounded-full">
              {students.length}
            </span>
          )}
        </div>

        {/* List */}
        <div className="min-h-0">
          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse h-12 bg-gray-100 rounded-lg"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600 text-center">{error}</div>
          ) : students.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              No students assigned yet.
            </div>
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {students
                  .slice(
                    (currentPage - 1) * STUDENTS_PER_PAGE,
                    currentPage * STUDENTS_PER_PAGE,
                  )
                  .map((student) => (
                    <StudentListItem
                      key={student.id}
                      student={student}
                      isActive={student.id === activeStudentId}
                      onSelect={(s) => onStudentClick?.(s)}
                      onMessage={(s) => onMessageClick?.(s)}
                      onLessonSpace={handleLessonSpace}
                      onAssignCourse={(s) => {
                        setAssigningStudent(s);
                        setIsAssigningCourse(true);
                      }}
                    />
                  ))}
              </ul>
              {students.length > STUDENTS_PER_PAGE && (
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {(currentPage - 1) * STUDENTS_PER_PAGE + 1}–
                    {Math.min(currentPage * STUDENTS_PER_PAGE, students.length)}{" "}
                    of {students.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-md text-xs font-medium text-[#2B4257] bg-[#2B4257]/5 hover:bg-[#2B4257]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(
                            p + 1,
                            Math.ceil(students.length / STUDENTS_PER_PAGE),
                          ),
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(students.length / STUDENTS_PER_PAGE)
                      }
                      className="px-3 py-1 rounded-md text-xs font-medium text-[#2B4257] bg-[#2B4257]/5 hover:bg-[#2B4257]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Assign course overlay modal */}
      {isAssigningCourse && assigningStudent && (
        <AssignCourseModal
          student={assigningStudent}
          courses={courses}
          setIsAssigningCourse={setIsAssigningCourse}
        />
      )}
    </>
  );
}
