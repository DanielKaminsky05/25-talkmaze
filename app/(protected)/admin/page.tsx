"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/services/supabase/client";
import type { EventInput } from "@fullcalendar/core";

import CoachAssignmentCard from "./components/CoachAssignmentCard";
import CreateAdminModal from "./components/CreateAdminModal";
import CreateCoachModal from "./components/CreateCoachModal";
import CreateCourseModal from "./components/CreateCourseModal";
import StudentDetailModal from "./components/StudentDetailModal";
import EmployeeDetailModal from "./components/EmployeeDetailModal";
import CourseDetailModal from "./components/CourseDetailModal";
import CourseLessonsPanel from "./components/CourseLessonPanel";
import AdminCalendar from "./components/AdminCalendar";
import Pagination from "./components/Pagination";
import { Assignment } from "@/lib/types/assignments";
import { Student } from "./components/StudentTable";
import { Coach } from "./components/AssignStudentDropDown";
import { Course } from "./components/types";

const ITEMS_PER_PAGE = 15;

type TabType = "students" | "coaches" | "courses" | "assignments";

const NAV_ITEMS: { key: TabType; label: string }[] = [
  { key: "students", label: "Students" },
  { key: "coaches", label: "Coaches" },
  { key: "courses", label: "Courses" },
  { key: "assignments", label: "Assignments" },
];

// ── List item components (module-level to avoid re-mount on parent render) ──

function Avatar({ letter, color = "text-[#B1E7D6]", bg = "bg-[#B1E7D6]/15" }: { letter: string; color?: string; bg?: string }) {
  return (
    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
      <span className={`${color} text-sm font-bold`}>{letter.toUpperCase()}</span>
    </div>
  );
}

function StudentListItem({ student, isSelected, onClick }: { student: Student; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-l-2 ${
        isSelected ? "bg-[#B1E7D6]/10 border-l-[#B1E7D6]" : "border-l-transparent hover:bg-white/5"
      }`}
    >
      <Avatar letter={student.name.charAt(0) || "?"} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? "text-[#B1E7D6]" : "text-white"}`}>
          {student.name || "Unknown"}
        </p>
        <p className="text-white/35 text-xs truncate font-mono">#{student.id.slice(0, 14)}</p>
      </div>
      {student.remaining_lessons != null && (
        <span className="text-xs font-semibold text-[#B1E7D6]/60 shrink-0">{student.remaining_lessons}</span>
      )}
    </button>
  );
}

function CoachListItem({ coach, isSelected, onClick }: { coach: Coach; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-l-2 ${
        isSelected ? "bg-[#65CFAD]/10 border-l-[#65CFAD]" : "border-l-transparent hover:bg-white/5"
      }`}
    >
      <Avatar letter={coach.first_name.charAt(0) || "?"} color="text-[#65CFAD]" bg="bg-[#65CFAD]/15" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? "text-[#65CFAD]" : "text-white"}`}>
          {coach.first_name} {coach.last_name}
        </p>
        <p className="text-white/35 text-xs truncate font-mono">#{coach.id.slice(0, 14)}</p>
      </div>
    </button>
  );
}

function CourseListItem({ course, isSelected, onClick }: { course: Course; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-l-2 ${
        isSelected ? "bg-blue-300/10 border-l-blue-300" : "border-l-transparent hover:bg-white/5"
      }`}
    >
      <Avatar letter={course.name.charAt(0) || "C"} color="text-blue-300" bg="bg-blue-400/15" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? "text-blue-300" : "text-white"}`}>{course.name}</p>
        <p className="text-white/35 text-xs truncate">ID: {course.id}</p>
      </div>
    </button>
  );
}

function EmptyDetail() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-white/20 text-sm">Select an item from the list</p>
    </div>
  );
}

// Handles "HH:MM:SS" (start_time_new) and "1970-01-01THH:MM:SS.000Z" (start_time)
function parseAvailabilityTime(val: string | null | undefined): string {
  if (!val) return "";
  if (/^\d{2}:\d{2}/.test(val)) return val.slice(0, 5); // "HH:MM:SS" → "HH:MM"
  if (val.length > 10) return val.slice(11, 16);          // ISO datetime → "HH:MM"
  return "";
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("students");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Students
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState(false);
  const [studentEvents, setStudentEvents] = useState<EventInput[]>([]);
  const [studentEventsLoading, setStudentEventsLoading] = useState(false);

  // Coaches
  const [employees, setEmployees] = useState<Coach[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePage, setEmployeePage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState<Coach | null>(null);
  const [editingEmployee, setEditingEmployee] = useState(false);
  const [coachEvents, setCoachEvents] = useState<EventInput[]>([]);
  const [coachEventsLoading, setCoachEventsLoading] = useState(false);

  // Courses
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courseSearch, setCourseSearch] = useState("");
  const [coursePage, setCoursePage] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [editingCourse, setEditingCourse] = useState(false);

  // Assignments
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

  // Create modals
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [isCreateCoachModalOpen, setIsCreateCoachModalOpen] = useState(false);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function checkAdminRole() {
      try {
        const res = await fetch("/api/user/role");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.role !== 3) router.push("/home");
        else setIsAuthorized(true);
      } catch {
        router.push("/home");
      }
    }
    checkAdminRole();
  }, [router]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchStudents() {
      try {
        setStudentsLoading(true);
        const res = await fetch("/api/admin/students");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setStudents(
          Array.isArray(data)
            ? data.map((s: any) => ({
                id: String(s.id),
                account_id: String(s.account_id),
                name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim(),
                created_at: s.created_at ?? "",
                updated_at: s.updated_at ?? "",
                lesson_space_id: s.lesson_space_id ?? null,
                profile_access_pin: s.profile_access_pin ?? null,
                teach_works_url: s.teach_works_url ?? null,
                lesson_space_teacher_link: s.lesson_space_teacher_link ?? null,
                lesson_space_student_link: s.lesson_space_student_link ?? null,
                remaining_lessons: s.remaining_lessons ?? null,
              }))
            : [],
        );
      } finally {
        setStudentsLoading(false);
      }
    }
    fetchStudents();
  }, []);

  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const res = await fetch("/api/admin/employees");
      if (!res.ok) throw new Error();
      setEmployees(await res.json());
    } finally {
      setEmployeesLoading(false);
    }
  };
  useEffect(() => { fetchEmployees(); }, []);

  useEffect(() => {
    async function fetchCourses() {
      try {
        setCoursesLoading(true);
        const res = await fetch("/api/admin/courses");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setCourses(data.map((c: any) => ({ id: c.id, name: c.title, description: c.description })));
      } finally {
        setCoursesLoading(false);
      }
    }
    fetchCourses();
  }, []);

  useEffect(() => {
    fetch("/api/admin/assignments")
      .then((r) => r.json())
      .then((d) => setAssignments(Array.isArray(d) ? d : []))
      .catch(() => setAssignments([]))
      .finally(() => setAssignmentsLoading(false));
  }, []);

  // ── Calendar data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedStudent) { setStudentEvents([]); return; }
    setStudentEventsLoading(true);
    const supabase = createClient();
    supabase
      .from("sessions")
      .select("id, start_time, end_time, coaches(first_name, last_name)")
      .eq("student_id", selectedStudent.id)
      .order("start_time", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Student sessions fetch error:", error);
        const events: EventInput[] = (data ?? [])
          .filter((s: any) => s.start_time)
          .map((s: any) => {
            const coach = s.coaches;
            const title = coach
              ? `${coach.first_name ?? ""} ${coach.last_name ?? ""}`.trim() || "Session"
              : "Session";
            return {
              id: String(s.id),
              title,
              start: s.start_time,
              end: s.end_time ?? undefined,
              backgroundColor: "#B1E7D6",
              borderColor: "transparent",
              textColor: "#1F2E3B",
            };
          });
        setStudentEvents(events);
        setStudentEventsLoading(false);
      });
  }, [selectedStudent?.id]);

  useEffect(() => {
    if (!selectedEmployee) { setCoachEvents([]); return; }
    setCoachEventsLoading(true);
    const supabase = createClient();

    Promise.all([
      supabase
        .from("coach_availabilities")
        .select("weekday, start_time, end_time, start_time_new, end_time_new")
        .eq("coach_id", selectedEmployee.id),
      supabase
        .from("sessions")
        .select("id, start_time, end_time, student_id, students(first_name, last_name)")
        .eq("coach_id", selectedEmployee.id),
    ]).then(([{ data: availability }, { data: sessions }]) => {
      const availabilityEvents: EventInput[] = (availability ?? [])
        .map((s) => {
          const start = parseAvailabilityTime(s.start_time_new ?? s.start_time);
          const end = parseAvailabilityTime(s.end_time_new ?? s.end_time);
          if (!start || !end) return null;
          return {
            daysOfWeek: [s.weekday ?? 0],
            startTime: start,
            endTime: end,
            title: `${start} – ${end}`,
            backgroundColor: "#1e4535",
            borderColor: "#65CFAD",
            textColor: "#65CFAD",
          };
        })
        .filter(Boolean) as EventInput[];

      const sessionEvents: EventInput[] = (sessions ?? []).map((s: any) => {
        const student = s.students;
        const name = student
          ? `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || "Session"
          : "Session";
        return {
          id: String(s.id),
          title: name,
          start: s.start_time,
          end: s.end_time ?? undefined,
          backgroundColor: "#B1E7D6",
          borderColor: "transparent",
          textColor: "#1F2E3B",
        };
      });

      setCoachEvents([...availabilityEvents, ...sessionEvents]);
      setCoachEventsLoading(false);
    });
  }, [selectedEmployee?.id]);

  // ── Reset page on search change ───────────────────────────────────────────
  useEffect(() => { setStudentPage(1); }, [studentSearch]);
  useEffect(() => { setEmployeePage(1); }, [employeeSearch]);
  useEffect(() => { setCoursePage(1); }, [courseSearch]);

  // ── Filtered + paginated ──────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.account_id.toLowerCase().includes(q) ||
        (s.profile_access_pin ?? "").toLowerCase().includes(q),
    );
  }, [students, studentSearch]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter(
      (e) =>
        e.first_name.toLowerCase().includes(q) ||
        e.last_name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.account_id.toLowerCase().includes(q),
    );
  }, [employees, employeeSearch]);

  const filteredCourses = useMemo(() => {
    if (!courseSearch.trim()) return courses;
    const q = courseSearch.toLowerCase();
    return courses.filter((c) => c.name.toLowerCase().includes(q) || c.id.toString().includes(q));
  }, [courses, courseSearch]);

  const studentTotalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const employeeTotalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const courseTotalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);

  const paginatedStudents = useMemo(() => filteredStudents.slice((studentPage - 1) * ITEMS_PER_PAGE, studentPage * ITEMS_PER_PAGE), [filteredStudents, studentPage]);
  const paginatedEmployees = useMemo(() => filteredEmployees.slice((employeePage - 1) * ITEMS_PER_PAGE, employeePage * ITEMS_PER_PAGE), [filteredEmployees, employeePage]);
  const paginatedCourses = useMemo(() => filteredCourses.slice((coursePage - 1) * ITEMS_PER_PAGE, coursePage * ITEMS_PER_PAGE), [filteredCourses, coursePage]);

  // ── Assignment handlers ───────────────────────────────────────────────────
  const handleAddAssignment = async (coachId: string, studentId: string) => {
    const res = await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coach_id: coachId, student_id: studentId }),
    });
    if (!res.ok) { alert("Failed to add assignment"); return; }
    const newAssignment = await res.json();
    setAssignments((prev) => [...prev, newAssignment]);
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    const res = await fetch(`/api/admin/assignments/${assignmentId}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Failed to remove assignment");
      fetch("/api/admin/assignments").then((r) => r.json()).then(setAssignments);
    }
  };

  // ── Tab switch helper ─────────────────────────────────────────────────────
  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedStudent(null);
    setSelectedEmployee(null);
    setSelectedCourse(null);
    setMobileShowDetail(false);
  };

  const selectStudent = (s: Student) => { setSelectedStudent(s); setMobileShowDetail(true); };
  const selectEmployee = (e: Coach) => { setSelectedEmployee(e); setMobileShowDetail(true); };
  const selectCourse = (c: Course) => { setSelectedCourse(c); setMobileShowDetail(true); };

  // ── Loading / auth gates ──────────────────────────────────────────────────
  if (isAuthorized === null || studentsLoading || employeesLoading || coursesLoading) {
    return (
      <div className="min-h-screen bg-[#2B4257] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#B1E7D6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">{isAuthorized === null ? "Verifying access…" : "Loading…"}</p>
        </div>
      </div>
    );
  }
  if (!isAuthorized) return null;

  const inputClass =
    "w-full bg-[#1F2E3B] border border-white/8 text-white placeholder:text-white/25 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#B1E7D6]/40 transition-colors";

  // ── Derived selection state ───────────────────────────────────────────────
  const hasDetail =
    (activeTab === "students" && !!selectedStudent) ||
    (activeTab === "coaches" && !!selectedEmployee) ||
    (activeTab === "courses" && !!selectedCourse);

  return (
    <div className="h-screen bg-[#2B4257] flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="shrink-0 bg-[#1F2E3B] border-b border-white/8 shadow-[0_2px_12px_rgba(0,0,0,0.3)] z-10">
        <div className="flex items-center justify-between px-4 md:px-6 py-3.5">
          <div className="flex items-center gap-3">
            {/* Mobile back button (when in detail view) */}
            {mobileShowDetail && hasDetail && (
              <button
                onClick={() => setMobileShowDetail(false)}
                className="md:hidden -ml-1 w-8 h-8 flex items-center justify-center text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-white font-bold text-base leading-none">Admin Dashboard</h1>
            </div>
          </div>
          <button
            onClick={() => setIsCreateAdminModalOpen(true)}
            className="bg-[#B1E7D6] text-[#1F2E3B] font-semibold text-xs px-3.5 py-2 rounded-xl hover:bg-[#9ed4c1] transition-colors shadow-[0_4px_12px_rgba(177,231,214,0.2)]"
          >
            + Admin
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Desktop sidebar ── */}
        <nav className="hidden md:flex flex-col shrink-0 w-16 lg:w-56 bg-[#1F2E3B] border-r border-white/5 py-3 px-2 gap-0.5">
          {NAV_ITEMS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`px-3 py-2.5 rounded-xl transition-all text-left text-sm font-semibold ${
                activeTab === key
                  ? "bg-[#B1E7D6] text-[#1F2E3B]"
                  : "text-white/45 hover:text-white hover:bg-white/5"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* ── Content area ── */}
        <div className="flex flex-1 min-w-0 overflow-hidden">

          {/* ── List panel ── */}
          {activeTab !== "assignments" ? (
            <div
              className={`shrink-0 w-full md:w-72 lg:w-80 xl:w-[340px] bg-[#162330] border-r border-white/5 flex flex-col overflow-hidden
                ${mobileShowDetail ? "hidden md:flex" : "flex"}`}
            >
              {/* Search + action */}
              <div className="p-3 border-b border-white/5 flex gap-2 shrink-0">
                <input
                  type="text"
                  placeholder={
                    activeTab === "students" ? "Search students…" :
                    activeTab === "coaches" ? "Search coaches…" : "Search courses…"
                  }
                  value={
                    activeTab === "students" ? studentSearch :
                    activeTab === "coaches" ? employeeSearch : courseSearch
                  }
                  onChange={(e) => {
                    if (activeTab === "students") setStudentSearch(e.target.value);
                    else if (activeTab === "coaches") setEmployeeSearch(e.target.value);
                    else setCourseSearch(e.target.value);
                  }}
                  className={inputClass}
                />
                {activeTab === "coaches" && (
                  <button
                    onClick={() => setIsCreateCoachModalOpen(true)}
                    title="New Coach"
                    className="shrink-0 w-10 h-10 bg-[#65CFAD] text-[#1F2E3B] rounded-xl flex items-center justify-center font-bold text-lg hover:bg-[#50bfa0] transition-colors"
                  >+</button>
                )}
                {activeTab === "courses" && (
                  <button
                    onClick={() => setIsCreateCourseModalOpen(true)}
                    title="New Course"
                    className="shrink-0 w-10 h-10 bg-[#B1E7D6] text-[#1F2E3B] rounded-xl flex items-center justify-center font-bold text-lg hover:bg-[#9ed4c1] transition-colors"
                  >+</button>
                )}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === "students" && (
                  <>
                    {paginatedStudents.length === 0 ? (
                      <p className="text-white/25 text-sm text-center py-12">No students found</p>
                    ) : (
                      paginatedStudents.map((s) => (
                        <StudentListItem key={s.id} student={s} isSelected={selectedStudent?.id === s.id} onClick={() => selectStudent(s)} />
                      ))
                    )}
                  </>
                )}
                {activeTab === "coaches" && (
                  <>
                    {paginatedEmployees.length === 0 ? (
                      <p className="text-white/25 text-sm text-center py-12">No coaches found</p>
                    ) : (
                      paginatedEmployees.map((e) => (
                        <CoachListItem key={e.id} coach={e} isSelected={selectedEmployee?.id === e.id} onClick={() => selectEmployee(e)} />
                      ))
                    )}
                  </>
                )}
                {activeTab === "courses" && (
                  <>
                    {paginatedCourses.length === 0 ? (
                      <p className="text-white/25 text-sm text-center py-12">No courses found</p>
                    ) : (
                      paginatedCourses.map((c) => (
                        <CourseListItem key={c.id} course={c} isSelected={selectedCourse?.id === c.id} onClick={() => selectCourse(c)} />
                      ))
                    )}
                  </>
                )}
              </div>

              {/* Pagination */}
              <div className="shrink-0 border-t border-white/5 px-3 py-2">
                {activeTab === "students" && (
                  <Pagination currentPage={studentPage} totalPages={studentTotalPages} totalItems={filteredStudents.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setStudentPage} />
                )}
                {activeTab === "coaches" && (
                  <Pagination currentPage={employeePage} totalPages={employeeTotalPages} totalItems={filteredEmployees.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setEmployeePage} />
                )}
                {activeTab === "courses" && (
                  <Pagination currentPage={coursePage} totalPages={courseTotalPages} totalItems={filteredCourses.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCoursePage} />
                )}
              </div>
            </div>
          ) : null}

          {/* ── Detail panel / Assignments ── */}
          <div
            className={`flex-1 min-w-0 overflow-y-auto
              ${activeTab !== "assignments" && !mobileShowDetail ? "hidden md:flex md:flex-col" : "flex flex-col"}`}
          >
            {/* ── ASSIGNMENTS tab (full-width) ── */}
            {activeTab === "assignments" && (
              <div className="p-4 md:p-6 space-y-3">
                {filteredEmployees.map((coach) => {
                  const coachAssignments = assignments.filter((a) => a.coach_id === coach.id.toString());
                  const assignedIds = new Set(coachAssignments.map((a) => a.student_id));
                  const availableStudents = students.filter((s) => !assignedIds.has(s.id.toString()));
                  return (
                    <CoachAssignmentCard
                      key={coach.id}
                      coach={coach}
                      assignedStudents={coachAssignments}
                      availableStudents={availableStudents}
                      onAdd={(sId) => handleAddAssignment(coach.id.toString(), sId)}
                      onRemove={handleRemoveAssignment}
                    />
                  );
                })}
              </div>
            )}

            {/* ── STUDENT detail ── */}
            {activeTab === "students" && !selectedStudent && (
              <EmptyDetail />
            )}
            {activeTab === "students" && selectedStudent && (
              <div className="p-4 md:p-6 space-y-5">
                {/* Header card */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#B1E7D6]/20 flex items-center justify-center shrink-0">
                      <span className="text-[#B1E7D6] text-2xl font-bold">
                        {selectedStudent.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-white text-xl font-bold leading-tight">{selectedStudent.name}</h2>
                      <p className="text-white/35 text-xs mt-0.5 font-mono">#{selectedStudent.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingStudent(true)}
                    className="shrink-0 px-3.5 py-1.5 text-xs font-semibold text-[#1F2E3B] bg-[#B1E7D6] hover:bg-[#9ed4c1] rounded-xl transition-colors"
                  >
                    Edit
                  </button>
                </div>

                {/* Info chips */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Remaining Lessons", value: selectedStudent.remaining_lessons ?? "—", accent: "text-[#B1E7D6]" },
                    { label: "Account ID", value: selectedStudent.account_id.slice(0, 12) + "…", accent: "text-white/70" },
                    { label: "PIN", value: selectedStudent.profile_access_pin ?? "—", accent: "text-white/70" },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className="bg-[#1F2E3B] rounded-xl p-3 border border-white/5">
                      <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">{label}</p>
                      <p className={`${accent} text-sm font-semibold truncate`}>{String(value)}</p>
                    </div>
                  ))}
                </div>

                {/* Calendar */}
                <div className="bg-[#1F2E3B] rounded-2xl p-4 border border-white/5">
                  <AdminCalendar
                    events={studentEvents}
                    initialView="dayGridMonth"
                    loading={studentEventsLoading}
                    offsetPx={340}
                  />
                </div>
              </div>
            )}

            {/* ── COACH detail ── */}
            {activeTab === "coaches" && !selectedEmployee && (
              <EmptyDetail />
            )}
            {activeTab === "coaches" && selectedEmployee && (
              <div className="p-4 md:p-6 space-y-5">
                {/* Header card */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#65CFAD]/20 flex items-center justify-center shrink-0">
                      <span className="text-[#65CFAD] text-2xl font-bold">
                        {selectedEmployee.first_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-white text-xl font-bold leading-tight">
                        {selectedEmployee.first_name} {selectedEmployee.last_name}
                      </h2>
                      <p className="text-white/35 text-xs mt-0.5 font-mono">#{selectedEmployee.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingEmployee(true)}
                    className="shrink-0 px-3.5 py-1.5 text-xs font-semibold text-[#1F2E3B] bg-[#65CFAD] hover:bg-[#50bfa0] rounded-xl transition-colors"
                  >
                    Edit
                  </button>
                </div>

                {/* Info chips */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Account ID", value: selectedEmployee.account_id.slice(0, 16) + "…" },
                    { label: "Joined", value: selectedEmployee.created_at ? new Date(selectedEmployee.created_at).toLocaleDateString() : "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#1F2E3B] rounded-xl p-3 border border-white/5">
                      <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">{label}</p>
                      <p className="text-white/70 text-sm font-semibold truncate">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Calendar legend */}
                <div className="flex items-center gap-4 px-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[#1e4535] border border-[#65CFAD]" />
                    <span className="text-white/40 text-xs">Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[#B1E7D6]" />
                    <span className="text-white/40 text-xs">Booked</span>
                  </div>
                </div>

                {/* Calendar */}
                <div className="bg-[#1F2E3B] rounded-2xl p-4 border border-white/5">
                  <AdminCalendar
                    events={coachEvents}
                    initialView="timeGridWeek"
                    loading={coachEventsLoading}
                    offsetPx={360}
                  />
                </div>
              </div>
            )}

            {/* ── COURSE detail ── */}
            {activeTab === "courses" && !selectedCourse && (
              <EmptyDetail />
            )}
            {activeTab === "courses" && selectedCourse && (
              <div className="p-4 md:p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar letter={selectedCourse.name.charAt(0) || "C"} color="text-blue-300" bg="bg-blue-400/15" />
                    <div>
                      <h2 className="text-white text-xl font-bold leading-tight">{selectedCourse.name}</h2>
                      <p className="text-white/35 text-xs mt-0.5">Course #{selectedCourse.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingCourse(true)}
                    className="shrink-0 px-3.5 py-1.5 text-xs font-semibold text-white/70 bg-white/10 hover:bg-white/15 rounded-xl transition-colors"
                  >
                    Edit
                  </button>
                </div>

                {selectedCourse.description && (
                  <div className="bg-[#1F2E3B] rounded-xl p-4 border border-white/5">
                    <p className="text-white/50 text-sm leading-relaxed">{selectedCourse.description}</p>
                  </div>
                )}

                {/* Lessons */}
                <div className="bg-[#1F2E3B] rounded-2xl p-4 border border-white/5">
                  <CourseLessonsPanel courseId={String(selectedCourse.id)} students={students} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden shrink-0 bg-[#1F2E3B] border-t border-white/10 flex safe-bottom">
        {NAV_ITEMS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`flex-1 py-3 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              activeTab === key ? "text-[#B1E7D6]" : "text-white/35 hover:text-white/60"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ── Edit modals ── */}
      {editingStudent && selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setEditingStudent(false)}
          onUpdate={(updated) => {
            setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            setSelectedStudent(updated);
            setEditingStudent(false);
          }}
        />
      )}
      {editingEmployee && selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setEditingEmployee(false)}
          onUpdate={(updated) => {
            setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            setSelectedEmployee(updated);
            setEditingEmployee(false);
          }}
        />
      )}
      {editingCourse && selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          students={students}
          onClose={() => setEditingCourse(false)}
          onUpdate={(updated) => {
            setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setSelectedCourse(updated);
            setEditingCourse(false);
          }}
          onDelete={() => {
            setCourses((prev) => prev.filter((c) => c.id !== selectedCourse.id));
            setSelectedCourse(null);
            setEditingCourse(false);
          }}
        />
      )}

      <CreateAdminModal
        isOpen={isCreateAdminModalOpen}
        onClose={() => setIsCreateAdminModalOpen(false)}
        onSuccess={() => alert("Admin account created successfully!")}
      />
      <CreateCoachModal
        isOpen={isCreateCoachModalOpen}
        onClose={() => setIsCreateCoachModalOpen(false)}
        onSuccess={() => { alert("Coach created successfully"); fetchEmployees(); }}
      />
      <CreateCourseModal
        isOpen={isCreateCourseModalOpen}
        onClose={() => setIsCreateCourseModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
