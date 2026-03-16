"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  TeachworksStudent,
  TeachworksEmployee,
  TeachworksCourse,
} from "@/lib/teachworks/types";
import StudentTable from "./components/StudentTable";
import EmployeeTable from "./components/EmployeeTable";
import CreateAdminModal from "./components/CreateAdminModal";
import CourseTable from "./components/CourseTable";
import CreateCourseModal from "./components/CreateCourseModal";
import CourseLessonsPanel from "./components/CourseLessonPanel";
import { Assignment } from "@/lib/types/assignments";
import CoachAssignmentCard from "./components/CoachAssignmentCard";

const ITEMS_PER_PAGE = 5;

type TabType = "students" | "coaches" | "courses" | "assignments" | "learning_space";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("students");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Student state
  const [students, setStudents] = useState<TeachworksStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] =
    useState<TeachworksStudent | null>(null);

  // editing student
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<TeachworksStudent>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Employee state
  const [employees, setEmployees] = useState<TeachworksEmployee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [employeeCurrentPage, setEmployeeCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] =
    useState<TeachworksEmployee | null>(null);

  // editing employee
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [employeeEditForm, setEmployeeEditForm] = useState<
    Partial<TeachworksEmployee>
  >({});
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);

  // Modal state
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);

  // Course state
  const [courses, setCourses] = useState<TeachworksCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [courseCurrentPage, setCourseCurrentPage] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState<TeachworksCourse | null>(
    null
  );
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [courseEditForm, setCourseEditForm] = useState<
    Partial<TeachworksCourse>
  >({});
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);

  // Assignment state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

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
    const res = await fetch(`/api/admin/assignments/${assignmentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Failed to remove assignment");
      fetch("/api/admin/assignments")
        .then((r) => r.json())
        .then(setAssignments);
    }
  };

  useEffect(() => {
    fetch("/api/admin/assignments")
      .then((r) => r.json())
      .then((data) => setAssignments(Array.isArray(data) ? data : []))
      .catch(() => setAssignments([]))
      .finally(() => setAssignmentsLoading(false));
  }, []);

  useEffect(() => {
    async function fetchCourses() {
      try {
        setCoursesLoading(true);
        const response = await fetch("/api/admin/courses");
        if (!response.ok) throw new Error("Failed to fetch courses");
        const data = await response.json();
        const mapped = data.map((c: any) => ({
          id: c.id,
          name: c.title,
          description: c.description,
        }));
        setCourses(mapped);
      } catch (err) {
        setCoursesError(
          err instanceof Error ? err.message : "An error occurred"
        );
      } finally {
        setCoursesLoading(false);
      }
    }
    fetchCourses();
  }, []);

  useEffect(() => {
    setCourseCurrentPage(1);
  }, [courseSearchQuery]);

  const filteredCourses = useMemo(() => {
    if (!courseSearchQuery.trim()) return courses;
    const query = courseSearchQuery.toLowerCase();
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.id.toString().includes(query)
    );
  }, [courses, courseSearchQuery]);

  const courseTotalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);
  const paginatedCourses = useMemo(() => {
    const start = (courseCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredCourses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCourses, courseCurrentPage]);

  const handleCloseCourseModal = () => {
    setSelectedCourse(null);
    setIsEditingCourse(false);
    setCourseEditForm({});
  };
  const handleEditCourseStart = () => {
    setCourseEditForm({ ...selectedCourse });
    setIsEditingCourse(true);
  };
  const handleEditCourseCancel = () => {
    setCourseEditForm({});
    setIsEditingCourse(false);
  };
  const handleEditCourseSave = async () => {
    if (!selectedCourse) return;
    setIsSavingCourse(true);
    try {
      const response = await fetch(`/api/admin/courses/${selectedCourse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: courseEditForm }),
      });
      if (!response.ok) throw new Error("Failed to update course");
      const updated = await response.json();
      setCourses((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setSelectedCourse(updated);
      setIsEditingCourse(false);
      setCourseEditForm({});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSavingCourse(false);
    }
  };
  const handleDeleteCourse = async () => {
    if (
      !selectedCourse ||
      !confirm(`Delete "${selectedCourse.name}"? This cannot be undone.`)
    )
      return;
    setIsDeletingCourse(true);
    try {
      const response = await fetch(`/api/admin/courses/${selectedCourse.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete course");
      setCourses((prev) => prev.filter((c) => c.id !== selectedCourse.id));
      handleCloseCourseModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeletingCourse(false);
    }
  };

  // Check admin role
  useEffect(() => {
    async function checkAdminRole() {
      try {
        const response = await fetch("/api/user/role");
        if (!response.ok) throw new Error("Failed to fetch user role");
        const data = await response.json();
        if (data.role !== 3) {
          router.push("/home");
        } else {
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
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
        setStudents(data);
      } catch (err) {
        setStudentsError(
          err instanceof Error ? err.message : "An error occurred"
        );
      } finally {
        setStudentsLoading(false);
      }
    }
    fetchStudents();
  }, []);

  // Fetch employees
  useEffect(() => {
    async function fetchEmployees() {
      try {
        setEmployeesLoading(true);
        const response = await fetch("/api/admin/employees");
        if (!response.ok) throw new Error("Failed to fetch employees");
        const data = await response.json();
        setEmployees(data);
      } catch (err) {
        setEmployeesError(
          err instanceof Error ? err.message : "An error occurred"
        );
      } finally {
        setEmployeesLoading(false);
      }
    }
    fetchEmployees();
  }, []);


  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return students;
    const query = studentSearchQuery.toLowerCase();
    return students.filter((student) => {
      return (
        student.first_name.toLowerCase().includes(query) ||
        student.last_name.toLowerCase().includes(query) ||
        student.id.toString().includes(query) ||
        student.customer_id.toString().includes(query)
      );
    });
  }, [students, studentSearchQuery]);

  const handleEditStart = () => {
    setEditForm({ ...selectedStudent });
    setIsEditing(true);
  };
  const handleEditCancel = () => {
    setEditForm({});
    setIsEditing(false);
  };
  const handleEditSave = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/admin/students/${selectedStudent.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student: editForm }),
        }
      );
      if (!response.ok) throw new Error("Failed to update student");
      const updated = await response.json();
      setStudents((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setSelectedStudent(updated);
      setIsEditing(false);
      setEditForm({});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const teachers = employees.filter(
      (employee) => employee.position === "Teacher"
    );
    if (!employeeSearchQuery.trim()) return teachers;
    const query = employeeSearchQuery.toLowerCase();
    return teachers.filter((employee) => {
      return (
        employee.first_name.toLowerCase().includes(query) ||
        employee.last_name.toLowerCase().includes(query) ||
        employee.id.toString().includes(query) ||
        employee.position.toLowerCase().includes(query)
      );
    });
  }, [employees, employeeSearchQuery]);

  useEffect(() => { setStudentCurrentPage(1); }, [studentSearchQuery]);
  useEffect(() => { setEmployeeCurrentPage(1); }, [employeeSearchQuery]);

  const handleCloseStudentModal = () => {
    setSelectedStudent(null);
    setIsEditing(false);
    setEditForm({});
  };
  const handleCloseEmployeeModal = () => {
    setSelectedEmployee(null);
    setIsEditingEmployee(false);
    setEmployeeEditForm({});
  };
  const handleEditEmployeeStart = () => {
    setEmployeeEditForm({ ...selectedEmployee });
    setIsEditingEmployee(true);
  };
  const handleEditEmployeeCancel = () => {
    setEmployeeEditForm({});
    setIsEditingEmployee(false);
  };
  const handleEditEmployeeSave = async () => {
    if (!selectedEmployee) return;
    setIsSavingEmployee(true);
    try {
      const response = await fetch(
        `/api/admin/employees/${selectedEmployee.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employee: employeeEditForm }),
        }
      );
      if (!response.ok) throw new Error("Failed to update employee");
      const updated = await response.json();
      setEmployees((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e))
      );
      setSelectedEmployee(updated);
      setIsEditingEmployee(false);
      setEmployeeEditForm({});
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSavingEmployee(false);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedStudent) handleCloseStudentModal();
        if (selectedEmployee) handleCloseEmployeeModal();
        if (selectedCourse) handleCloseCourseModal();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedStudent, selectedEmployee, selectedCourse]);

  const studentTotalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = useMemo(() => {
    const startIndex = (studentCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredStudents, studentCurrentPage]);

  const employeeTotalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = useMemo(() => {
    const startIndex = (employeeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredEmployees.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredEmployees, employeeCurrentPage]);

  const loading =
    activeTab === "students"
      ? studentsLoading
      : activeTab === "coaches"
      ? employeesLoading
      : coursesLoading;
  const error =
    activeTab === "students"
      ? studentsError
      : activeTab === "coaches"
      ? employeesError
      : coursesError;

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

  const handleGetLessonSpaces = async() => {
    try{
      console.log("Inside handleGetLessonSpaces")
      const response = await fetch('/api/learningSpace')

      if(!response.ok){
        console.log("Error with response")
      }

      await response.json();
      console.log("Response: " + JSON.stringify(response))
    }catch(err){
      console.log("Error fetching lesson spaces");
    }
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
        <button
          onClick={() => setActiveTab("students")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "students"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Students
        </button>
        <button
          onClick={() => setActiveTab("coaches")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "coaches"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Coaches
        </button>
        <button
          onClick={() => setActiveTab("courses")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "courses"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Courses
        </button>
        <button
          onClick={() => setActiveTab("assignments")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "assignments"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Assignments
        </button>

        <button
          onClick={() => setActiveTab("learning_space")}
           className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "learning_space"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Learning Spaces
        </button>
      </div>

      {/* ── Students Tab ── */}
      {activeTab === "students" && (
        <>
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search by name, student ID, or customer ID..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <StudentTable
            students={paginatedStudents}
            onStudentClick={setSelectedStudent}
          />
          {studentTotalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-600">
                Showing {(studentCurrentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(
                  studentCurrentPage * ITEMS_PER_PAGE,
                  filteredStudents.length
                )}{" "}
                of {filteredStudents.length}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setStudentCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={studentCurrentPage === 1}
                  className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="px-2 py-1 text-xs text-gray-700">
                  {studentCurrentPage} / {studentTotalPages}
                </span>
                <button
                  onClick={() =>
                    setStudentCurrentPage((p) => Math.min(p + 1, studentTotalPages))
                  }
                  disabled={studentCurrentPage === studentTotalPages}
                  className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {studentTotalPages <= 1 && filteredStudents.length > 0 && (
            <p className="mt-3 text-xs text-gray-600">
              Total: {filteredStudents.length}
            </p>
          )}
        </>
      )}

      {/* ── Coaches Tab ── */}
      {activeTab === "coaches" && (
        <>
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search by name, employee ID, or position..."
              value={employeeSearchQuery}
              onChange={(e) => setEmployeeSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
          <EmployeeTable
            employees={paginatedEmployees}
            onEmployeeClick={setSelectedEmployee}
          />
          {employeeTotalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-600">
                Showing {(employeeCurrentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(
                  employeeCurrentPage * ITEMS_PER_PAGE,
                  filteredEmployees.length
                )}{" "}
                of {filteredEmployees.length}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() =>
                    setEmployeeCurrentPage((p) => Math.max(p - 1, 1))
                  }
                  disabled={employeeCurrentPage === 1}
                  className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="px-2 py-1 text-xs text-gray-700">
                  {employeeCurrentPage} / {employeeTotalPages}
                </span>
                <button
                  onClick={() =>
                    setEmployeeCurrentPage((p) =>
                      Math.min(p + 1, employeeTotalPages)
                    )
                  }
                  disabled={employeeCurrentPage === employeeTotalPages}
                  className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {employeeTotalPages <= 1 && filteredEmployees.length > 0 && (
            <p className="mt-3 text-xs text-gray-600">
              Total: {filteredEmployees.length}
            </p>
          )}
        </>
      )}

      {/* ── Student Detail Modal ── */}
      {selectedStudent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleCloseStudentModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">
                {isEditing
                  ? `${editForm.first_name ?? selectedStudent.first_name} ${editForm.last_name ?? selectedStudent.last_name}`
                  : `${selectedStudent.first_name} ${selectedStudent.last_name}`}
              </h2>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <button
                      onClick={handleEditStart}
                      className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleCloseStudentModal}
                      className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEditSave}
                      disabled={isSaving}
                      className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleEditCancel}
                      className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              {(() => {
                const Field = ({
                  label,
                  fieldKey,
                  type = "text",
                }: {
                  label: string;
                  fieldKey: keyof TeachworksStudent;
                  type?: string;
                }) => (
                  <div>
                    <span className="text-gray-500">{label}:</span>
                    {isEditing ? (
                      <input
                        type={type}
                        value={(editForm[fieldKey] as string) ?? ""}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            [fieldKey]: e.target.value,
                          }))
                        }
                        className="mt-0.5 block w-full border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {(selectedStudent[fieldKey] as string) || "N/A"}
                      </p>
                    )}
                  </div>
                );

                const SelectField = ({
                  label,
                  fieldKey,
                  options,
                }: {
                  label: string;
                  fieldKey: keyof TeachworksStudent;
                  options: string[];
                }) => (
                  <div>
                    <span className="text-gray-500">{label}:</span>
                    {isEditing ? (
                      <select
                        value={(editForm[fieldKey] as string) ?? ""}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            [fieldKey]: e.target.value,
                          }))
                        }
                        className="mt-0.5 block w-full border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p
                        className={`font-medium ${
                          fieldKey === "status" &&
                          selectedStudent.status === "Active"
                            ? "text-green-600"
                            : "text-gray-900 capitalize"
                        }`}
                      >
                        {(selectedStudent[fieldKey] as string) || "N/A"}
                      </p>
                    )}
                  </div>
                );

                return (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Basic Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Student ID:</span>
                          <p className="text-gray-900 font-medium">
                            {selectedStudent.id}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Customer ID:</span>
                          <p className="text-gray-900 font-medium">
                            {selectedStudent.customer_id}
                          </p>
                        </div>
                        <Field label="First Name" fieldKey="first_name" />
                        <Field label="Last Name" fieldKey="last_name" />
                        <SelectField
                          label="Type"
                          fieldKey="student_type"
                          options={["Individual", "Group"]}
                        />
                        <SelectField
                          label="Status"
                          fieldKey="status"
                          options={["Active", "Inactive"]}
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Contact Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <Field label="Email" fieldKey="email" type="email" />
                        <Field
                          label="Additional Email"
                          fieldKey="additional_email"
                          type="email"
                        />
                        <Field label="Home Phone" fieldKey="home_phone" />
                        <Field label="Mobile Phone" fieldKey="mobile_phone" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Academic Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <Field label="School" fieldKey="school" />
                        <Field label="Grade" fieldKey="grade" />
                        <Field label="Subjects" fieldKey="subjects" />
                        <Field label="Birth Date" fieldKey="birth_date" type="date" />
                        <Field label="Start Date" fieldKey="start_date" type="date" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Billing Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <SelectField
                          label="Billing Method"
                          fieldKey="billing_method"
                          options={["Invoice", "Credit Card", "Check", "Cash"]}
                        />
                        <Field label="Discount Rate" fieldKey="discount_rate" />
                      </div>
                    </div>
                    {selectedStudent.default_teachers.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                          Default Teachers
                        </h3>
                        <div className="text-xs space-y-1">
                          {selectedStudent.default_teachers.map((teacher) => (
                            <p key={teacher.id} className="text-gray-900">
                              {teacher.first_name} {teacher.last_name}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedStudent.default_services.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                          Default Services
                        </h3>
                        <div className="text-xs space-y-1">
                          {selectedStudent.default_services.map((service) => (
                            <p key={service.id} className="text-gray-900">
                              {service.name}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedStudent.custom_fields.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                          Custom Fields
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {selectedStudent.custom_fields.map((field) => (
                            <div key={field.field_id}>
                              <span className="text-gray-500">{field.name}:</span>
                              <p className="text-gray-900">{field.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Additional Notes
                      </h3>
                      {isEditing ? (
                        <textarea
                          value={(editForm.additional_notes as string) ?? ""}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              additional_notes: e.target.value,
                            }))
                          }
                          rows={3}
                          className="block w-full border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-xs text-gray-900">
                          {selectedStudent.additional_notes || "N/A"}
                        </p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Employee Detail Modal ── */}
      {selectedEmployee && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleCloseEmployeeModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">
                {isEditingEmployee
                  ? `${employeeEditForm.first_name ?? selectedEmployee.first_name} ${employeeEditForm.last_name ?? selectedEmployee.last_name}`
                  : `${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
              </h2>
              <div className="flex items-center gap-2">
                {!isEditingEmployee ? (
                  <>
                    <button
                      onClick={handleEditEmployeeStart}
                      className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleCloseEmployeeModal}
                      className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEditEmployeeSave}
                      disabled={isSavingEmployee}
                      className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
                    >
                      {isSavingEmployee ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleEditEmployeeCancel}
                      className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              {(() => {
                const Field = ({
                  label,
                  fieldKey,
                  type = "text",
                }: {
                  label: string;
                  fieldKey: keyof TeachworksEmployee;
                  type?: string;
                }) => (
                  <div>
                    <span className="text-gray-500">{label}:</span>
                    {isEditingEmployee ? (
                      <input
                        type={type}
                        value={(employeeEditForm[fieldKey] as string) ?? ""}
                        onChange={(e) =>
                          setEmployeeEditForm((prev) => ({
                            ...prev,
                            [fieldKey]: e.target.value,
                          }))
                        }
                        className="mt-0.5 block w-full border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {(selectedEmployee[fieldKey] as string) || "N/A"}
                      </p>
                    )}
                  </div>
                );
                const SelectField = ({
                  label,
                  fieldKey,
                  options,
                  colorFn,
                }: {
                  label: string;
                  fieldKey: keyof TeachworksEmployee;
                  options: string[];
                  colorFn?: (val: string) => string;
                }) => (
                  <div>
                    <span className="text-gray-500">{label}:</span>
                    {isEditingEmployee ? (
                      <select
                        value={(employeeEditForm[fieldKey] as string) ?? ""}
                        onChange={(e) =>
                          setEmployeeEditForm((prev) => ({
                            ...prev,
                            [fieldKey]: e.target.value,
                          }))
                        }
                        className="mt-0.5 block w-full border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p
                        className={`font-medium capitalize ${
                          colorFn
                            ? colorFn(selectedEmployee[fieldKey] as string)
                            : "text-gray-900"
                        }`}
                      >
                        {(selectedEmployee[fieldKey] as string) || "N/A"}
                      </p>
                    )}
                  </div>
                );
                const TextArea = ({
                  label,
                  fieldKey,
                }: {
                  label: string;
                  fieldKey: keyof TeachworksEmployee;
                }) => (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      {label}
                    </h3>
                    {isEditingEmployee ? (
                      <textarea
                        value={(employeeEditForm[fieldKey] as string) ?? ""}
                        onChange={(e) =>
                          setEmployeeEditForm((prev) => ({
                            ...prev,
                            [fieldKey]: e.target.value,
                          }))
                        }
                        rows={3}
                        className="block w-full border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-xs text-gray-900">
                        {(selectedEmployee[fieldKey] as string) || "N/A"}
                      </p>
                    )}
                  </div>
                );
                return (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Basic Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Employee ID:</span>
                          <p className="text-gray-900 font-medium">
                            {selectedEmployee.id}
                          </p>
                        </div>
                        <Field label="First Name" fieldKey="first_name" />
                        <Field label="Last Name" fieldKey="last_name" />
                        <Field label="Type" fieldKey="employee_type" />
                        <Field label="Position" fieldKey="position" />
                        <SelectField
                          label="Status"
                          fieldKey="status"
                          options={["Active", "Inactive"]}
                          colorFn={(val) =>
                            val === "Active" ? "text-green-600" : "text-gray-600"
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Contact Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <Field label="Email" fieldKey="email" type="email" />
                        <Field label="Mobile Phone" fieldKey="mobile_phone" />
                        <Field label="Home Phone" fieldKey="home_phone" />
                        <Field label="Address" fieldKey="address" />
                        <Field label="City" fieldKey="city" />
                        <Field label="State" fieldKey="state" />
                        <Field label="Zip" fieldKey="zip" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Employment Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <Field label="Hire Date" fieldKey="hire_date" type="date" />
                        <Field label="Birth Date" fieldKey="birth_date" type="date" />
                        <Field label="Subjects" fieldKey="subjects" />
                      </div>
                    </div>
                    <TextArea label="Bio" fieldKey="bio" />
                    <TextArea label="Additional Notes" fieldKey="additional_notes" />
                    {selectedEmployee.custom_fields.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                          Custom Fields
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {selectedEmployee.custom_fields.map((field) => (
                            <div key={field.field_id}>
                              <span className="text-gray-500">{field.name}:</span>
                              <p className="text-gray-900">{field.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Courses Tab ── */}
      {activeTab === "courses" && (
        <>
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={courseSearchQuery}
              onChange={(e) => setCourseSearchQuery(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <button
              onClick={() => setIsCreateCourseModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors whitespace-nowrap"
            >
              + New Course
            </button>
          </div>

          <CourseTable
            courses={paginatedCourses}
            onCourseClick={setSelectedCourse}
          />

          {courseTotalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-600">
                Showing {(courseCurrentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(
                  courseCurrentPage * ITEMS_PER_PAGE,
                  filteredCourses.length
                )}{" "}
                of {filteredCourses.length}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setCourseCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={courseCurrentPage === 1}
                  className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="px-2 py-1 text-xs text-gray-700">
                  {courseCurrentPage} / {courseTotalPages}
                </span>
                <button
                  onClick={() =>
                    setCourseCurrentPage((p) => Math.min(p + 1, courseTotalPages))
                  }
                  disabled={courseCurrentPage === courseTotalPages}
                  className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {courseTotalPages <= 1 && filteredCourses.length > 0 && (
            <p className="mt-3 text-xs text-gray-600">
              Total: {filteredCourses.length}
            </p>
          )}
        </>
      )}

      {/* ── Assignments Tab ── */}
      {activeTab === "assignments" && (
        <div className="space-y-3">
          {filteredEmployees.map((coach) => {
            const coachAssignments = assignments.filter(
              (a) => a.coach_id === coach.id.toString()
            );
            const assignedStudentIds = new Set(
              coachAssignments.map((a) => a.student_id)
            );
            const availableStudents = students.filter(
              (s) => !assignedStudentIds.has(s.id.toString())
            );
            return (
              <CoachAssignmentCard
                key={coach.id}
                coach={coach}
                assignedStudents={coachAssignments}
                availableStudents={availableStudents}
                onAdd={(studentId) =>
                  handleAddAssignment(coach.id.toString(), studentId)
                }
                onRemove={(assignmentId) => handleRemoveAssignment(assignmentId)}
              />
            );
          })}
        </div>
      )}

      {activeTab == 'learning_space' && (
        <div>
          <button onClick = {handleGetLessonSpaces}>
            Get Learning Spaces
          </button>
        </div>
      )}
      {/* Course Detail Modal */}
      {selectedCourse && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleCloseCourseModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">
                {isEditingCourse
                  ? (courseEditForm.name ?? selectedCourse.name)
                  : selectedCourse.name}
              </h2>
              <div className="flex items-center gap-2">
                {!isEditingCourse ? (
                  <>
                    <button
                      onClick={handleDeleteCourse}
                      disabled={isDeletingCourse}
                      className="px-3 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors disabled:opacity-50"
                    >
                      {isDeletingCourse ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      onClick={handleEditCourseStart}
                      className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleCloseCourseModal}
                      className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEditCourseSave}
                      disabled={isSavingCourse}
                      className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
                    >
                      {isSavingCourse ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleEditCourseCancel}
                      className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-4 space-y-6 text-xs">
              {/* Course Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Course Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-500">Course ID:</span>
                    <p className="text-gray-900 font-medium">
                      {selectedCourse.id}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Name:</span>
                    {isEditingCourse ? (
                      <input
                        type="text"
                        value={courseEditForm.name ?? ""}
                        onChange={(e) =>
                          setCourseEditForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="mt-0.5 block w-full border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {selectedCourse.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Description:</span>
                    {isEditingCourse ? (
                      <textarea
                        value={courseEditForm.description ?? ""}
                        onChange={(e) =>
                          setCourseEditForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        rows={4}
                        className="mt-0.5 block w-full border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">
                        {selectedCourse.description || "N/A"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <hr className="border-gray-100" />

              {/* ── Lessons Panel ── */}
              <CourseLessonsPanel courseId={String(selectedCourse.id)} />
            </div>
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      <CreateCourseModal
        isOpen={isCreateCourseModalOpen}
        onClose={() => setIsCreateCourseModalOpen(false)}
        onSuccess={(created) =>
          setCourses((prev) => [...prev, created as TeachworksCourse])
        }
      />

      {/* Create Admin Modal */}
      <CreateAdminModal
        isOpen={isCreateAdminModalOpen}
        onClose={() => setIsCreateAdminModalOpen(false)}
        onSuccess={() => {
          alert("Admin account created successfully!");
        }}
      />
    </div>
  );
}