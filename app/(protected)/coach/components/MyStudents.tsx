"use client";

import { useEffect, useState } from "react";
import AssignCourseModal from "./AssignCourseModal";
import StudentListItem from "./students-list/StudentListItem";
import type { Database } from "@/database";

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
      <div className="rounded-2xl bg-white border border-[#2B4257]/10 shadow-sm overflow-hidden flex flex-col max-h-[600px] xl:max-h-none">
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-[#2B4257]/10 bg-[#2B4257]/5 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold text-[#2B4257]">
            My Students
          </h2>
          {!loading && !error && (
            <span className="bg-[#2B4257]/10 text-[#2B4257] text-xs font-semibold px-2.5 py-1 rounded-full">
              {students.length}
            </span>
          )}
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse h-16 bg-gray-100 rounded-lg"
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
            <ul className="divide-y divide-gray-100">
              {students.map((student) => (
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
