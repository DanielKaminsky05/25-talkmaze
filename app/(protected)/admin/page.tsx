"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

import StudentTable, { Student } from "./components/StudentTable";
import EmployeeTable from "./components/EmployeeTable";
import CourseTable from "./components/CourseTable";
import CoachAssignmentCard from "./components/CoachAssignmentCard";
import CreateAdminModal from "./components/CreateAdminModal";
import CreateCoachModal from "./components/CreateCoachModal";
import CreateCourseModal from "./components/CreateCourseModal";
import StudentDetailModal from "./components/StudentDetailModal";
import EmployeeDetailModal from "./components/EmployeeDetailModal";
import CourseDetailModal from "./components/CourseDetailModal";
import Pagination from "./components/Pagination";
import { Assignment } from "@/lib/types/assignments";
import { Coach } from "./components/AssignStudentDropDown";
import { Course } from "./components/types";

const ITEMS_PER_PAGE = 5;

type TabType = "students" | "coaches" | "courses" | "assignments" | "learning_space" | "course_assignment";

const TABS: { key: TabType; label: string }[] = [
  { key: "students", label: "Students" },
  { key: "coaches", label: "Coaches" },
  { key: "courses", label: "Courses" },
  { key: "assignments", label: "Assignments" },
  { key: "learning_space", label: "Learning Spaces" },
  { key: "course_assignment", label: "Course Assignment" },
];

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("students");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Students
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Employees
  const [employees, setEmployees] = useState<Coach[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePage, setEmployeePage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState<Coach | null>(null);

  // Courses
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [courseSearch, setCourseSearch] = useState("");
  const [coursePage, setCoursePage] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Assignments
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

  // Modals
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [isCreateCoachModalOpen, setIsCreateCoachModalOpen] = useState(false);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);

  // Auth check
  useEffect(() => {
    async function checkAdminRole() {
      try {
        const response = await fetch("/api/user/role");
        if (!response.ok) throw new Error("Failed to fetch user role");
        const data = await response.json();
        if (data.role !== 3) router.push("/home");
        else setIsAuthorized(true);
      } catch {
        router.push("/home");
      }
    }
    checkAdminRole();
  }, [router]);

  // Fetch students
  useEffect(() => {
    async function fetchStudents() {
      try {
        setStudentsLoading(true);
        const response = await fetch("/api/admin/students");
        if (!response.ok) throw new Error("Failed to fetch students");
        const data = await response.json();
        const mapped: Student[] = Array.isArray(data)
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
          : [];
        setStudents(mapped);
      } catch (err) {
        setStudentsError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setStudentsLoading(false);
      }
    }
    fetchStudents();
  }, []);

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const response = await fetch("/api/admin/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      setEmployees(data);
    } catch (err) {
      setEmployeesError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  // Fetch courses
  useEffect(() => {
    async function fetchCourses() {
      try {
        setCoursesLoading(true);
        const response = await fetch("/api/admin/courses");
        if (!response.ok) throw new Error("Failed to fetch courses");
        const data = await response.json();
        setCourses(
          data.map((c: any) => ({
            id: c.id,
            name: c.title,
            description: c.description,
          })),
        );
      } catch (err) {
        setCoursesError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setCoursesLoading(false);
      }
    }
    fetchCourses();
  }, []);

  // Fetch assignments
  useEffect(() => {
    fetch("/api/admin/assignments")
      .then((r) => r.json())
      .then((data) => setAssignments(Array.isArray(data) ? data : []))
      .catch(() => setAssignments([]))
      .finally(() => setAssignmentsLoading(false));
  }, []);

  // Reset page on search change
  useEffect(() => { setStudentPage(1); }, [studentSearch]);
  useEffect(() => { setEmployeePage(1); }, [employeeSearch]);
  useEffect(() => { setCoursePage(1); }, [courseSearch]);

  // Filtered + paginated data
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
    return courses.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.toString().includes(q),
    );
  }, [courses, courseSearch]);

  const studentTotalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const employeeTotalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const courseTotalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);

  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStudents, studentPage]);

  const paginatedEmployees = useMemo(() => {
    const start = (employeePage - 1) * ITEMS_PER_PAGE;
    return filteredEmployees.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEmployees, employeePage]);

  const paginatedCourses = useMemo(() => {
    const start = (coursePage - 1) * ITEMS_PER_PAGE;
    return filteredCourses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCourses, coursePage]);

  // Assignment handlers
  const handleAddAssignment = async (coachId: string, studentId: string) => {
    const res = await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coach_id: coachId, student_id: studentId }),
    });
    if (!res.ok) {
      alert("Failed to add assignment");
      return;
    }
    const newAssignment = await res.json();
    setAssignments((prev) => [...prev, newAssignment]);
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    const res = await fetch(`/api/admin/assignments/${assignmentId}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Failed to remove assignment");
      fetch("/api/admin/assignments")
        .then((r) => r.json())
        .then(setAssignments);
    }
  };

  const loading =
    activeTab === "students" ? studentsLoading :
    activeTab === "coaches" ? employeesLoading :
    coursesLoading;

  const error =
    activeTab === "students" ? studentsError :
    activeTab === "coaches" ? employeesError :
    coursesError;

  if (isAuthorized === null) {
    return (
      <div className="p-4 max-w-md">
        <h1 className="text-base font-bold mb-2 text-gray-900">Admin</h1>
        <p className="text-sm text-gray-700">Verifying access...</p>
      </div>
    );
  }
  if (!isAuthorized) return null;
  if (loading) {
    return (
      <div className="p-4 max-w-md">
        <h1 className="text-base font-bold mb-2 text-gray-900">Admin</h1>
        <p className="text-sm text-gray-700">Loading...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 max-w-md">
        <h1 className="text-base font-bold mb-2 text-gray-900">Admin</h1>
        <p className="text-sm text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-base font-bold text-gray-900">Admin</h1>
        <button
          onClick={() => setIsCreateAdminModalOpen(true)}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          + Create Admin
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-3 border-b border-gray-200">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Students Tab */}
      {activeTab === "students" && (
        <>
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search by name, student ID, or customer ID..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <StudentTable students={paginatedStudents} onStudentClick={setSelectedStudent} />
          <Pagination
            currentPage={studentPage}
            totalPages={studentTotalPages}
            totalItems={filteredStudents.length}
            onPageChange={setStudentPage}
          />
        </>
      )}

      {/* Coaches Tab */}
      {activeTab === "coaches" && (
        <>
          <div className="flex justify-between items-center mb-3">
            <input
              type="text"
              placeholder="Search by name, employee ID, or position..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900 mr-3"
            />
            <button
              onClick={() => setIsCreateCoachModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors whitespace-nowrap"
            >
              + Create Coach
            </button>
          </div>
          <EmployeeTable employees={paginatedEmployees} onEmployeeClick={setSelectedEmployee} />
          <Pagination
            currentPage={employeePage}
            totalPages={employeeTotalPages}
            totalItems={filteredEmployees.length}
            onPageChange={setEmployeePage}
          />
        </>
      )}

      {/* Courses Tab */}
      {activeTab === "courses" && (
        <>
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <button
              onClick={() => setIsCreateCourseModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors whitespace-nowrap"
            >
              + New Course
            </button>
          </div>
          <CourseTable courses={paginatedCourses} onCourseClick={setSelectedCourse} />
          <Pagination
            currentPage={coursePage}
            totalPages={courseTotalPages}
            totalItems={filteredCourses.length}
            onPageChange={setCoursePage}
          />
        </>
      )}

      {/* Assignments Tab */}
      {activeTab === "assignments" && (
        <div className="space-y-3">
          {filteredEmployees.map((coach) => {
            const coachAssignments = assignments.filter(
              (a) => a.coach_id === coach.id.toString(),
            );
            const assignedStudentIds = new Set(coachAssignments.map((a) => a.student_id));
            const availableStudents = students.filter(
              (s) => !assignedStudentIds.has(s.id.toString()),
            );
            return (
              <CoachAssignmentCard
                key={coach.id}
                coach={coach}
                assignedStudents={coachAssignments}
                availableStudents={availableStudents}
                onAdd={(studentId) => handleAddAssignment(coach.id.toString(), studentId)}
                onRemove={handleRemoveAssignment}
              />
            );
          })}
        </div>
      )}

      {activeTab === "learning_space" && (
        <div>
          <button
            onClick={async () => {
              try {
                const response = await fetch("/api/learningSpace");
                await response.json();
              } catch {
                // ignore
              }
            }}
          >
            Get Learning Spaces
          </button>
        </div>
      )}
      {activeTab === "course_assignment" && <div />}

      {/* Modals */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onUpdate={(updated) => {
            setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            setSelectedStudent(updated);
          }}
        />
      )}

      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onUpdate={(updated) => {
            setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            setSelectedEmployee(updated);
          }}
        />
      )}

      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          students={students}
          onClose={() => setSelectedCourse(null)}
          onUpdate={(updated) => {
            setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setSelectedCourse(updated);
          }}
          onDelete={() => {
            setCourses((prev) => prev.filter((c) => c.id !== selectedCourse.id));
            setSelectedCourse(null);
          }}
        />
      )}

      <CreateCourseModal
        isOpen={isCreateCourseModalOpen}
        onClose={() => setIsCreateCourseModalOpen(false)}
        onSuccess={() => {}}
      />

      <CreateAdminModal
        isOpen={isCreateAdminModalOpen}
        onClose={() => setIsCreateAdminModalOpen(false)}
        onSuccess={() => alert("Admin account created successfully!")}
      />

      <CreateCoachModal
        isOpen={isCreateCoachModalOpen}
        onClose={() => setIsCreateCoachModalOpen(false)}
        onSuccess={() => {
          alert("Coach created successfully");
          fetchEmployees();
        }}
      />
    </div>
  );
}
