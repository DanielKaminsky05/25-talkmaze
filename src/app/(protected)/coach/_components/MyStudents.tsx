"use client";

import { useEffect, useMemo, useState } from "react";
import AssignCourseModal from "./AssignCourseModal";
import StudentListItem from "./students-list/StudentListItem";
import { fullName } from "@/src/utils/formatName";
import type { Database } from "@/src/services/supabase/types/database";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];

interface MyStudentsProps {
  students: Student[];
  activeStudentId?: string | null;
  onStudentClick?: (student: Student | null) => void;
  onMessageClick?: (student: Student | null) => void;
  coachId: string;
}

export default function MyStudents({
  students,
  activeStudentId,
  onStudentClick,
  onMessageClick,
  coachId,
}: MyStudentsProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [isAssigningCourse, setIsAssigningCourse] = useState(false);
  const [assigningStudent, setAssigningStudent] = useState<Student | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [launchingLessonSpaceId, setLaunchingLessonSpaceId] = useState<
    string | null
  >(null);
  const [panelMessage, setPanelMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const STUDENTS_PER_PAGE = 6;

  useEffect(() => {
    fetch("/api/admin/courses")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load courses");
        return r.json();
      })
      .then((coursesData) => setCourses(coursesData))
      .catch((err: unknown) =>
        setCoursesError(
          err instanceof Error ? err.message : "Failed to load courses",
        ),
      )
      .finally(() => setCoursesLoading(false));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;

    return students.filter((student) =>
      fullName(student.first_name, student.last_name, "Unnamed Student")
        .toLowerCase()
        .includes(query),
    );
  }, [students, search]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE),
  );

  const currentPageStudents = filteredStudents.slice(
    (currentPage - 1) * STUDENTS_PER_PAGE,
    currentPage * STUDENTS_PER_PAGE,
  );

  async function handleLessonSpace(studentId: string) {
    setPanelMessage(null);
    setLaunchingLessonSpaceId(studentId);

    try {
      const res = await fetch(`/api/coach/lessonspace/${coachId}/${studentId}`);
      if (!res.ok) {
        setPanelMessage({
          type: "error",
          text: "Could not open Lesson Space. Please try again.",
        });
        return;
      }

      const { client_url } = await res.json();
      setPanelMessage({
        type: "success",
        text: "Opening Lesson Space...",
      });
      window.location.href = client_url;
    } catch {
      setPanelMessage({
        type: "error",
        text: "Could not open Lesson Space. Please try again.",
      });
    } finally {
      setLaunchingLessonSpaceId(null);
    }
  }

  return (
    <>
      <div className="rounded-2xl bg-white border border-[#2B4257]/10 shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[#2B4257]/10 bg-[#B1E7D6] flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold text-[#1F2E3B]">My Students</h2>
          <span className="bg-white/60 text-[#1F2E3B] text-xs font-semibold px-2.5 py-1 rounded-full">
            {search.trim()
              ? `${filteredStudents.length}/${students.length}`
              : students.length}
          </span>
        </div>

        <div className="min-h-0 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search students..."
              aria-label="Search students"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2B4257]/30"
            />
            {panelMessage && (
              <p
                className={`mt-2 text-xs ${
                  panelMessage.type === "error"
                    ? "text-red-600"
                    : "text-emerald-700"
                }`}
              >
                {panelMessage.text}
              </p>
            )}
          </div>

          {students.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              No students assigned yet.
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              No students match your search.
            </div>
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {currentPageStudents.map((student) => (
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
                    isLaunchingLessonSpace={launchingLessonSpaceId === student.id}
                  />
                ))}
              </ul>

              {filteredStudents.length > STUDENTS_PER_PAGE && (
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {(currentPage - 1) * STUDENTS_PER_PAGE + 1}–
                    {Math.min(
                      currentPage * STUDENTS_PER_PAGE,
                      filteredStudents.length,
                    )}{" "}
                    of {filteredStudents.length}
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
                        setCurrentPage((p) => Math.min(p + 1, pageCount))
                      }
                      disabled={currentPage === pageCount}
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

      {isAssigningCourse && assigningStudent && (
        <AssignCourseModal
          student={assigningStudent}
          courses={courses}
          coursesLoading={coursesLoading}
          coursesError={coursesError}
          setIsAssigningCourse={setIsAssigningCourse}
          onAssignedMessage={(message) => setPanelMessage(message)}
        />
      )}
    </>
  );
}
